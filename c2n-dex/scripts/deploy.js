const hre = require("hardhat");
const { saveContractAddress } = require("../../c2n-contracts/scripts/utils");
const {
  abi,
} = require("../artifacts/contracts/v2-core/UniswapV2Pair.sol/UniswapV2Pair.json");

async function deployUniswap() {
  console.log("\n🐶...执行部署core合约脚本⏰");

  const [signer1] = await hre.ethers.getSigners();
  //uniswapv2工厂合约
  const factoryContract = await hre.ethers.getContractFactory(
    "UniswapV2Factory"
  );
  //构造uniswapv2工厂合约 使用signer1作为服务费接收者
  const factory = await factoryContract.deploy(signer1.address);
  await factory.waitForDeployment();

  //打印下init合约用于检查create2前后是否一致
  console.log("pair init code", await factory.INIT_CODE_PAIR_HASH());

  //开始写入合约配置
  //写入工厂合约地址
  saveContractAddress(
    hre.network.name,
    "UniswapV2Factory",
    await factory.getAddress()
  );
  console.log("\n\n🐵...执行部署periphery合约脚本⏰");
  //因为UniswapV2使用weth来代替eth 所以需要部署一次weth
  const wethContract = await hre.ethers.getContractFactory("WETH9");
  const weth = await wethContract.deploy();
  await weth.waitForDeployment();

  //部署UniswapV2Router协议
  const routerContract = await hre.ethers.getContractFactory(
    "UniswapV2Router02"
  );
  const router = await routerContract.deploy(
    await factory.getAddress(),
    await weth.getAddress()
  );
  await router.waitForDeployment();

  console.log("WETH contract address is %s", await weth.getAddress());
  console.log(
    "UniswapV2Router contract address is %s",
    await router.getAddress()
  );

  //写入weth合约地址
  saveContractAddress(hre.network.name, "WETH", await weth.getAddress());
  //写入UniswapV2Router合约地址
  saveContractAddress(
    hre.network.name,
    "UniswapV2Router",
    await router.getAddress()
  );

  console.log(
    "WETH,UniswapV2Router have been persisted in config/contract-addresses.json!"
  );
}
deployUniswap();
