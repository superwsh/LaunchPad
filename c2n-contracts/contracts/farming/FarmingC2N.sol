// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

// Farm distributes the ERC20 rewards based on staked LP to each user.
contract FarmingC2N is Ownable {
    using SafeERC20 for IERC20;

    // 用户信息
    struct UserInfo {
        uint256 amount; //质押数量
        uint256 rewardDebt; //已领取的奖励数量
    }

    struct PoolInfo {
        IERC20 lptoken; // 质押代币地址
        uint256 allocPoint; // 当前LP池子的分配分数，例如有三个池子abc对应的分数为a:b:c=10:20:10 那么在进行质押计算时,a=25%,b=50%,c=25%
        uint256 lastRewardTimestamp; //上次领取奖励时间
        uint256 accERC20PerShare; // 累积质押奖励数/每个单位token， *1e36（为了避免小数计算导致精度降低）.
        uint256 totalDeposits; // 总质押量
    }

    IERC20 public erc20; // ERC20奖励代币的合约地址
    uint256 public rewardPerSecond; // 每秒产生的ERC20代币奖励数量
    uint256 public totalAllocPoint; // 所有池子的分数总和
    PoolInfo[] public poolInfo;
    mapping(uint => mapping(address => UserInfo)) public userInfo; // 每个池字用户的质押以及奖励信息 [PoolId,[用户地址，用户信息]]
    uint public startTimestamp; // 奖励开始时间
    uint public endTimestamp; // 奖励结束时间
    uint public paidOut; // 已经支付的奖励总额
    uint public totalRewards; // 总奖励数量（最多可奖励的数量）

    //业务事件
    event Deposit(address indexed user, uint256 indexed pid, uint256 amount);
    event Withdraw(address indexed user, uint256 indexed pid, uint256 amount);
    event EmergencyWithdraw(
        address indexed user,
        uint256 indexed pid,
        uint256 amount
    );

    constructor(
        IERC20 _erc20,
        uint _rewardPerSecond,
        uint _startTimestamp
    ) Ownable(msg.sender) {
        erc20 = _erc20;
        rewardPerSecond = _rewardPerSecond;
        startTimestamp = _startTimestamp;
        endTimestamp = _startTimestamp;
    }

    // 添加质押池子
    function add(
        uint _allocPoint,
        IERC20 _lptoken,
        bool _withUpdate
    ) public onlyOwner {
        if (_withUpdate) {
            massUpdatePools();
        }
        uint lastRewardTimestamp = block.timestamp > startTimestamp
            ? block.timestamp
            : startTimestamp;
        poolInfo.push(
            PoolInfo(_lptoken, _allocPoint, lastRewardTimestamp, 0, 0)
        );
    }

    function poolLength() external view returns (uint256) {
        return poolInfo.length;
    }

    // 注入奖励代币，延长奖励时间
    function fund(uint _amount) public {
        require(block.timestamp < endTimestamp, "fund too late");
        erc20.safeTransferFrom(msg.sender, address(this), _amount);
        endTimestamp += _amount / rewardPerSecond;
        totalRewards += _amount;
    }

    // Update the given pool's ERC20 allocation point. Can only be called by the owner.
    function set(
        uint256 _pid,
        uint256 _allocPoint,
        bool _withUpdate
    ) public onlyOwner {
        if (_withUpdate) {
            massUpdatePools();
        }
        totalAllocPoint =
            totalAllocPoint -
            poolInfo[_pid].allocPoint +
            _allocPoint;
        poolInfo[_pid].allocPoint = _allocPoint;
    }

    // View function to see deposited LP for a user.
    function deposited(
        uint256 _pid,
        address _user
    ) external view returns (uint256) {
        UserInfo storage user = userInfo[_pid][_user];
        return user.amount;
    }

    // View function to see pending ERC20s for a user.
    function pending(
        uint256 _pid,
        address _user
    ) external view returns (uint256) {
        PoolInfo storage pool = poolInfo[_pid];
        UserInfo storage user = userInfo[_pid][_user];
        uint256 accERC20PerShare = pool.accERC20PerShare;

        uint256 lpSupply = pool.totalDeposits;

        if (block.timestamp > pool.lastRewardTimestamp && lpSupply != 0) {
            uint256 lastTimestamp = block.timestamp < endTimestamp
                ? block.timestamp
                : endTimestamp;
            uint256 timestampToCompare = pool.lastRewardTimestamp < endTimestamp
                ? pool.lastRewardTimestamp
                : endTimestamp;
            uint256 nrOfSeconds = lastTimestamp - timestampToCompare;
            uint256 erc20Reward = (nrOfSeconds *
                rewardPerSecond *
                pool.allocPoint) / totalAllocPoint;
            accERC20PerShare =
                accERC20PerShare +
                ((erc20Reward * 1e36) / lpSupply);
        }
        return (user.amount * accERC20PerShare) / 1e36 - user.rewardDebt;
    }

    // View function for total reward the farm has yet to pay out.
    function totalPending() external view returns (uint256) {
        if (block.timestamp <= startTimestamp) {
            return 0;
        }

        uint256 lastTimestamp = block.timestamp < endTimestamp
            ? block.timestamp
            : endTimestamp;
        return rewardPerSecond * (lastTimestamp - startTimestamp) - paidOut;
    }

    // 更新所有池子信息 Be careful of gas spending!
    function massUpdatePools() public {
        uint256 length = poolInfo.length;
        for (uint256 pid = 0; pid < length; ++pid) {
            updatePool(pid);
        }
    }

    //更新池子奖励
    function updatePool(uint _pid) public {
        PoolInfo storage pool = poolInfo[_pid];
        uint lastTimestamp = block.timestamp < endTimestamp
            ? block.timestamp
            : endTimestamp;
        // 奖励已结束，不执行任何操作
        if (pool.lastRewardTimestamp >= lastTimestamp) {
            return;
        }
        if (pool.totalDeposits == 0) {
            pool.lastRewardTimestamp = endTimestamp;
            return;
        }
        // 计算池子此期间新增的总奖励
        uint diffSeconds = lastTimestamp - pool.lastRewardTimestamp;
        uint poolRewards = ((diffSeconds * rewardPerSecond * pool.allocPoint) /
            totalAllocPoint) * 1e36;
        // 计算池子此期间每股新增的奖励
        uint perShare = poolRewards / pool.totalDeposits;
        // 累加池子每股奖励
        pool.accERC20PerShare += perShare;
        pool.lastRewardTimestamp = lastTimestamp;
    }

    // 将代币存入指定的池子，参与质押分配
    function deposit(uint _pid, uint _amount) public {
        updatePool(_pid);

        PoolInfo storage pool = poolInfo[_pid];
        UserInfo storage user = userInfo[_pid][msg.sender];

        if (user.amount > 0) {
            uint penddingReward = (user.amount * pool.accERC20PerShare) /
                1e36 -
                user.rewardDebt;
            erc20Transfer(msg.sender, penddingReward);
        }

        user.amount += _amount;
        user.rewardDebt = (pool.accERC20PerShare * user.amount) / 1e36;

        pool.lptoken.safeTransferFrom(msg.sender, address(this), _amount);
        pool.totalDeposits += _amount;
        emit Deposit(msg.sender, _pid, _amount);
    }

    // 提取代币
    function withdraw(uint _pid, uint _amount) public {
        updatePool(_pid);

        PoolInfo storage pool = poolInfo[_pid];
        UserInfo storage user = userInfo[_pid][msg.sender];

        require(
            user.amount > _amount,
            "withdraw: can't withdraw more than deposit"
        );
        uint penddingReward = (user.amount * pool.accERC20PerShare) /
            1e36 -
            user.rewardDebt;
        erc20Transfer(msg.sender, penddingReward);

        user.amount -= _amount;
        user.rewardDebt = (pool.accERC20PerShare * user.amount) / 1e36;

        pool.lptoken.safeTransfer(msg.sender, _amount);
        pool.totalDeposits -= _amount;
        emit Withdraw(msg.sender, _pid, _amount);
    }

    // 紧急提款，不获得奖励
    function emergencyWithdraw(uint _pid) public {
        PoolInfo storage pool = poolInfo[_pid];
        UserInfo storage user = userInfo[_pid][msg.sender];
        pool.lptoken.safeTransfer(msg.sneder, user.amount);
        pool.totalDeposits -= user.amount;
        emit EmergencyWithdraw(msg.sender, _pid, user.amount);
        user.amount = 0;
        user.rewardDebt = 0;
    }

    function erc20Transfer(address _to, uint _amount) internal {
        erc20.transfer(_to, _amount);
        paidOut += _amount;
    }
}
