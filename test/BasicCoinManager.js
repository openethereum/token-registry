"use strict";

const TokenReg = artifacts.require("TokenReg");
const BasicCoinManager = artifacts.require("BasicCoinManager");

contract("BasicCoinManager", accounts => {

  it("manager has no coins deployed initially", async () => {
    const coin_manager = await BasicCoinManager.deployed();
    assert.equal(0, await coin_manager.count());
  });

  it("manager can deploy new coin", async () => {
    const token_reg = await TokenReg.deployed();
    const coin_manager = await BasicCoinManager.deployed();
    const watcher_created = coin_manager.Created();

    // check that we can deploy
    //let can_deploy = await coin_manager.deploy.call(10, "abc", "coin1", token_reg);
    //assert(can_deploy);
  });

});


