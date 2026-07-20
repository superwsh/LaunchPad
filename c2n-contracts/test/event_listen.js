const { ethers } = require("hardhat");
require("dotenv").config();

async function waitPending() {
  console.log("==start pending=");
  let provider = ethers.provider;
  filter = {
    address: "0x61c36a8d610163660E21a8b7359e1Cac0C9133e1",
    topics: [ethers.id("SaleCreated(address,uint256,uint256,uint256)")],
  };
  provider.on(filter, (log, event) => {
    // Emitted whenever a DAI token transfer occurs
    console.log(log);
  });
}

//两种写法都可以
waitPending();
