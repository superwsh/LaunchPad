/**
 * 查看用户和合约代币状态
 * lpContract:LP代币合约（pair合约）
 * token1:token1合约
 * token2:token2合约
 *
 * 1. 获取用户在token1和token2上的余额
 * 2. 获取用户在LP代币上的余额
 * 3. LP合约中的token1和token2余额
 */

const { ethers } = require("hardhat");
const { getSavedContractAddresses } = require("../configs/scripts/utils");
const {
  abi: tokenAbi,
} = require("../artifacts/contracts/v2-periphery/interfaces/IERC20.sol/IERC20.json");
const {
  abi: pairAbi,
} = require("../artifacts/contracts/v2-core/UniswapV2Pair.sol/UniswapV2Pair.json");
const {
  abi: factoryAbi,
} = require("../artifacts/contracts/v2-core/UniswapV2Factory.sol/UniswapV2Factory.json");

async function status() {
  console.log("\n\n⏰...当前状态⏰");
  //获取token1 token2协议
  const token1Address = getSavedContractAddresses()[hre.network.name]["Token1"];
  const token2Address = getSavedContractAddresses()[hre.network.name]["Token2"];
  const [signer] = await ethers.getSigners();

  const factoryAddress =
    getSavedContractAddresses()[hre.network.name]["UniswapV2Factory"];
  const factory = await hre.ethers.getContractAt(
    factoryAbi,
    factoryAddress,
    signer
  );

  const token1 = await ethers.getContractAt(tokenAbi, token1Address, signer);
  const token2 = await ethers.getContractAt(tokenAbi, token2Address, signer);

  const pair = await hre.ethers.getContractAt(
    pairAbi,
    await factory.getPair(
      await token1.getAddress(),
      await token2.getAddress(),
      signer
    )
  );

  /**
   * 1. 获取用户在token1和token2上的余额
   */
  const balanceOf1 = await token1.balanceOf(signer.address);
  const balanceOf2 = await token2.balanceOf(signer.address);
  console.log("token1 balanceOf1 ", balanceOf1);
  console.log("token2 balanceOf2 ", balanceOf2);

  /**
   * 2. 获取用户在LP代币上的余额
   */
  const liquidity = await pair.balanceOf(signer.address);
  console.log("liquidity:用户LP代币余额", liquidity);

  /**
   * 3. LP合约中的token1和token2余额
   */
  const reservers = await pair.getReserves();
  //在uniswapv2中 pair会进行排序
  if (token1Address < token2Address) {
    console.log(
      "checking pair reverse token1=%s,token2=%s",
      reservers[0],
      reservers[1]
    );
  } else {
    console.log(
      "checking pair reverse token1=%s,token2=%s",
      reservers[1],
      reservers[0]
    );
  }
}

status();
