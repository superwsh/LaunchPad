const hre = require("hardhat");
const { ethers, upgrades } = require("hardhat");
const path = require("path");
const { spawn } = require("child_process");
const { saveContractAddress, getSavedContractAddresses } = require("../utils");
const config = require("../configs/saleConfig.json");
const salesConfig = require("../sales_config_refresher");

const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000";

async function getCurrentBlockTimestamp() {
  return (await ethers.provider.getBlock("latest")).timestamp;
}

/**
 * Step 1: 部署 C2N 代币
 */
async function deployC2NToken() {
  console.log("===== Step 1: Deploy C2N Token =====");
  const tokenName = "C2N";
  const symbol = "C2N";
  const totalSupply = "1000000000000000000000000000";
  const decimals = 18;

  const C2N = await hre.ethers.getContractFactory("C2NToken");
  const token = await C2N.deploy(tokenName, symbol, totalSupply, decimals);
  await token.waitForDeployment();
  console.log("C2N deployed to: ", await token.getAddress());

  saveContractAddress(hre.network.name, "C2N-TOKEN", await token.getAddress());
  return token;
}

/**
 * Step 2: 部署空投合约
 */
async function deployAirdrop() {
  console.log("===== Step 2: Deploy Airdrop =====");
  const c2nTokenAddress =
    getSavedContractAddresses()[hre.network.name]["C2N-TOKEN"];
  console.log("c2nTokenAddress: ", c2nTokenAddress);

  const air = await hre.ethers.getContractFactory("Airdrop");
  const Air = await air.deploy(c2nTokenAddress);
  await Air.waitForDeployment();
  console.log("Air deployed to: ", await Air.getAddress());

  saveContractAddress(hre.network.name, "Airdrop-C2N", await Air.getAddress());

  const c2nToken = await hre.ethers.getContractAt("C2NToken", c2nTokenAddress);
  let tx = await c2nToken.transfer(
    await Air.getAddress(),
    ethers.parseEther("10000")
  );
  await tx.wait();

  const balance = await c2nToken.balanceOf(await Air.getAddress());
  console.log("Airdrop balance of C2N token: ", ethers.formatEther(balance));

  tx = await Air.withdrawTokens();
  await tx.wait();

  const balanceAfter = await c2nToken.balanceOf(await Air.getAddress());
  console.log(
    "Airdrop balance of C2N token after withdrawTokens: ",
    ethers.formatEther(balanceAfter)
  );
}

/**
 * Step 3: 部署 IDO 相关合约 (Admin, SalesFactory, AllocationStaking)
 */
async function deployIdo() {
  console.log("===== Step 3: Deploy IDO Contracts =====");
  const c = config[hre.network.name];
  const contracts = getSavedContractAddresses()[hre.network.name];

  // 部署 Admin
  const Admin = await ethers.getContractFactory("Admin");
  console.log("ready to deploy admin");
  const admin = await Admin.deploy(c.admins);
  await admin.waitForDeployment();
  console.log("Admin contract deployed to: ", await admin.getAddress());
  saveContractAddress(hre.network.name, "Admin", await admin.getAddress());

  // 部署 SalesFactory
  console.log("ready to deploy salesFactory ");
  const SalesFactory = await ethers.getContractFactory("SalesFactory");
  const salesFactory = await SalesFactory.deploy(
    await admin.getAddress(),
    ZERO_ADDRESS
  );
  await salesFactory.waitForDeployment();
  saveContractAddress(
    hre.network.name,
    "SalesFactory",
    await salesFactory.getAddress()
  );
  console.log("Sales factory deployed to: ", await salesFactory.getAddress());

  // 部署 AllocationStaking (透明升级合约模式)
  console.log("ready to deploy AllocationStaking ");
  const currentTimestamp = await getCurrentBlockTimestamp();
  console.log("Farming starts at: ", currentTimestamp);
  const AllocationStaking = await ethers.getContractFactory("AllocationStaking");
  const allocationStaking = await upgrades.deployProxy(
    AllocationStaking,
    [
      contracts["C2N-TOKEN"],
      ethers.parseEther(c.allocationStakingRPS),
      currentTimestamp + c.delayBeforeStart,
      await salesFactory.getAddress(),
    ],
    { unsafeAllow: ["delegatecall"] }
  );
  await allocationStaking.waitForDeployment();
  console.log(
    "AllocationStaking Proxy deployed to:",
    await allocationStaking.getAddress()
  );
  saveContractAddress(
    hre.network.name,
    "AllocationStakingProxy",
    await allocationStaking.getAddress()
  );

  const proxyAdminContract = await upgrades.erc1967.getAdminAddress(
    await allocationStaking.getAddress()
  );
  saveContractAddress(hre.network.name, "ProxyAdmin", proxyAdminContract);
  console.log("Proxy Admin address is : ", proxyAdminContract);

  console.log("ready to setAllocationStaking params ");
  await salesFactory.setAllocationStaking(await allocationStaking.getAddress());
  console.log(
    `salesFactory.setAllocationStaking ${await allocationStaking.getAddress()} done.;`
  );

  const totalRewards = ethers.parseEther(c.initialRewardsAllocationStaking);

  const token = await hre.ethers.getContractAt(
    "C2NToken",
    contracts["C2N-TOKEN"]
  );

  console.log(
    "ready to approve ",
    c.initialRewardsAllocationStaking,
    " token to staking  "
  );

  let tx = await token.approve(
    await allocationStaking.getAddress(),
    totalRewards
  );
  await tx.wait();
  console.log(
    `token.approve(${await allocationStaking.getAddress()}, ${totalRewards.toString()});`
  );

  console.log("ready to add c2n to pool");
  tx = await allocationStaking.add(100, await token.getAddress(), true);
  await tx.wait();
  console.log(`allocationStaking.add(${await token.getAddress()});`);

  const fund = Math.floor(Number(c.initialRewardsAllocationStaking)).toString();
  console.log(`ready to fund ${fund} token for testing`);
  await allocationStaking.fund(ethers.parseEther(fund));
  console.log("Funded tokens");
}

/**
 * Step 4: 部署 Farm 合约
 */
async function deployFarm() {
  console.log("===== Step 4: Deploy Farm =====");
  const RPS = "1";
  const now = Math.round(new Date().getTime() / 1000);
  const startTS = now + 100;

  const c2nTokenAddress =
    getSavedContractAddresses()[hre.network.name]["C2N-TOKEN"];
  console.log("c2nTokenAddress: ", c2nTokenAddress);

  const farm = await hre.ethers.getContractFactory("FarmingC2N");
  const Farm = await farm.deploy(
    c2nTokenAddress,
    ethers.parseEther(RPS),
    startTS
  );
  await Farm.waitForDeployment();
  console.log("Farm deployed to: ", await Farm.getAddress());

  saveContractAddress(hre.network.name, "FarmingC2N", await Farm.getAddress());

  const C2N = await hre.ethers.getContractAt("C2NToken", c2nTokenAddress);
  const approveTx = await C2N.approve(
    await Farm.getAddress(),
    ethers.parseEther("50000")
  );
  await approveTx.wait();
  let tx = await Farm.fund(ethers.parseEther("50000"));
  await tx.wait();

  const lpTokenAddress =
    getSavedContractAddresses()[hre.network.name]["C2N-TOKEN"];
  await Farm.add(100, lpTokenAddress, true);
  console.log("Farm funded and LP token added");
}

/**
 * Step 5: 部署销售代币 (MCK)
 */
async function deploySalesToken() {
  console.log("===== Step 5: Deploy Sales Token (MCK) =====");
  const tokenName = "MOCK-TOKEN";
  const symbol = "MCK";
  const totalSupply = "1000000000000000000000000000";
  const decimals = 18;

  const MCK = await hre.ethers.getContractFactory("C2NToken");
  const token = await MCK.deploy(tokenName, symbol, totalSupply, decimals);
  await token.waitForDeployment();
  console.log("MCK deployed to: ", await token.getAddress());

  saveContractAddress(hre.network.name, "MOCK-TOKEN", await token.getAddress());
  return token;
}

/**
 * Step 6: 部署 Sale 合约并配置参数
 */
async function deploySales() {
  console.log("===== Step 6: Deploy Sale =====");

  salesConfig.refreshSalesConfig(hre.network.name);
  const contracts = getSavedContractAddresses()[hre.network.name];
  // 重新读取刷新后的配置，避免 require 缓存导致使用旧时间戳
  const c = salesConfig.getSalesConfig()[hre.network.name];

  const salesFactory = await hre.ethers.getContractAt(
    "SalesFactory",
    contracts["SalesFactory"]
  );

  let tx = await salesFactory.deploySale();
  await tx.wait();
  console.log("Sale is deployed successfully.");

  const lastDeployedSale = await salesFactory.getLastDeployedSale();
  console.log("Deployed Sale address is: ", lastDeployedSale);

  const sale = await hre.ethers.getContractAt("C2NSale", lastDeployedSale);
  console.log(
    `Successfully instantiated sale contract at address: ${lastDeployedSale}.`
  );

  const totalTokens = ethers.parseEther(c["totalTokens"]);
  console.log("Total tokens to sell: ", c["totalTokens"]);

  const tokenPriceInEth = ethers.parseEther(c["tokenPriceInEth"]);
  console.log("tokenPriceInEth:", c["tokenPriceInEth"]);

  const saleOwner = c["saleOwner"];
  console.log("Sale owner is: ", c["saleOwner"]);

  const registrationStart = c["registrationStartAt"];
  const registrationEnd = registrationStart + c["registrationLength"];
  const saleStartTime = registrationEnd + c["delayBetweenRegistrationAndSale"];
  const saleEndTime = saleStartTime + c["saleRoundLength"];
  const maxParticipation = ethers.parseEther(c["maxParticipation"]);

  const tokensUnlockTime = c["TGE"];

  console.log("ready to set sale params");

  tx = await sale.setSaleParams(
    contracts["MOCK-TOKEN"],
    saleOwner,
    tokenPriceInEth,
    totalTokens,
    saleEndTime,
    tokensUnlockTime,
    c["portionVestingPrecision"],
    maxParticipation
  );
  await tx.wait();
  console.log("Sale Params set successfully.");

  console.log("Setting registration time.");
  console.log("registrationStart:", registrationStart);
  console.log("registrationEnd:", registrationEnd);
  tx = await sale.setRegistrationTime(registrationStart, registrationEnd);
  await tx.wait();
  console.log("Registration time set.");

  console.log("Setting saleStart.");
  tx = await sale.setSaleStart(saleStartTime);
  await tx.wait();

  const unlockingTimes = c["unlockingTimes"];
  const percents = c["portionPercents"];

  console.log("Unlocking times: ", unlockingTimes);
  console.log("Percents: ", percents);
  console.log("Precision for vesting: ", c["portionVestingPrecision"]);
  console.log("Max vesting time shift in seconds: ", c["maxVestingTimeShift"]);

  console.log("Setting vesting params.");
  tx = await sale.setVestingParams(
    unlockingTimes,
    percents,
    c["maxVestingTimeShift"]
  );
  await tx.wait();
  console.log("Vesting parameters set successfully.");

  console.log({
    saleAddress: lastDeployedSale,
    saleToken: contracts["MOCK-TOKEN"],
    saleOwner,
    tokenPriceInEth: tokenPriceInEth.toString(),
    totalTokens: totalTokens.toString(),
    saleEndTime,
    tokensUnlockTime,
    registrationStart,
    registrationEnd,
    saleStartTime,
  });

  // Write sale info to database (non-critical, ignore failure on Windows)
  try {
    const salesRawData = JSON.stringify({
      saleAddress: lastDeployedSale,
      saleToken: contracts["MOCK-TOKEN"],
      saleOwner,
      tokenPriceInEth: tokenPriceInEth.toString(),
      totalTokens: totalTokens.toString(),
      saleEndTime,
      tokensUnlockTime,
      registrationStart,
      registrationEnd,
      saleStartTime,
    });

    console.log("Write sale info to database...");
    const isWindows = process.platform === "win32";
    const scriptExt = isWindows ? ".js" : ".sh";
    const updateDataPath = path.resolve(
      __dirname,
      `../../generate_update_data${scriptExt}`
    );
    if (isWindows) {
      // Windows: 用 Node.js 执行，避免 shell 转义问题
      const escapedData = salesRawData.replace(/"/g, '\\"');
      await executeCommandWithSpawn(
        `node ${updateDataPath} "${escapedData}" localhost:8080`
      );
    } else {
      await executeCommandWithSpawn(
        `sh ${updateDataPath} '${salesRawData}' localhost:8080`
      );
    }
  } catch (err) {
    console.log("Database write skipped (non-critical):", err.message);
  }
}

/**
 * Step 7: 执行 TGE (代币生成事件)
 */
async function deployTge() {
  console.log("===== Step 7: TGE (Token Generation Event) =====");
  const contracts = getSavedContractAddresses()[hre.network.name];
  const c = config[hre.network.name];

  const token = await hre.ethers.getContractAt(
    "C2NToken",
    contracts["MOCK-TOKEN"]
  );

  const salesFactory = await hre.ethers.getContractAt(
    "SalesFactory",
    contracts["SalesFactory"]
  );

  const lastDeployedSale = await salesFactory.getLastDeployedSale();

  await token.approve(lastDeployedSale, ethers.parseEther(c.totalTokens));
  console.log("Deployed Sale address is: ", lastDeployedSale);
  console.log(`token.approve(${await token.getAddress()}, ${c.totalTokens});`);

  const sale = await hre.ethers.getContractAt("C2NSale", lastDeployedSale);
  console.log(
    `Successfully instantiated sale contract at address: ${lastDeployedSale}.`
  );

  await sale.depositTokens();
  console.log("ido sale deposited");
}

// ========== 主流程 ==========
async function main() {
  console.log("========== IDO Full Deployment Started ==========");

  await deployC2NToken();
  await deployAirdrop();
  await deployIdo();
  await deployFarm();
  await deploySalesToken();
  await deploySales();
  await deployTge();

  console.log("========== IDO Full Deployment Completed ==========");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

// ========== 工具函数 ==========
function executeCommandWithSpawn(command, args = []) {
  return new Promise((resolve, reject) => {
    const proc = spawn(command, args, {
      stdio: "inherit",
      shell: true,
    });

    proc.on("close", (code) => {
      if (code === 0) {
        console.log(`命令执行成功，退出码: ${code}`);
        resolve(code);
      } else {
        console.error(`命令执行失败，退出码: ${code}`);
        reject(new Error(`进程退出，退出码: ${code}`));
      }
    });

    proc.on("error", (error) => {
      console.error(`启动进程时出错: ${error.message}`);
      reject(error);
    });
  });
}
