"use strict";

const TokenReg = artifacts.require("./TokenReg.sol");

module.exports = deployer => {
  deployer.deploy(TokenReg);
};

