"use strict";

const BasicCoinManager = artifacts.require("BasicCoinManager");
const TokenReg = artifacts.require("TokenReg");

module.exports = deployer => {
  deployer.deploy([TokenReg, BasicCoinManager]);
};

