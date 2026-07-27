pragma solidity 0.5.16;
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/ERC20Detailed.sol";

contract Token1 is ERC20, ERC20Detailed {
    constructor(uint256 initialSupply) public ERC20Detailed("Gold", "GLD", 18) {
        _mint(msg.sender, initialSupply);
    }
}
