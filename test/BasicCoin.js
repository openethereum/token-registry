"use strict";

const { assertThrowsAsync } = require("./utils.js");

const TokenReg = artifacts.require("TokenReg");
const BasicCoin = artifacts.require("BasicCoin");
const BasicCoinManager = artifacts.require("BasicCoinManager");

contract("BasicCoin", accounts => {

  it("maintains invariants", async () => {
    const token_reg = await TokenReg.deployed();
    const coin_manager = await BasicCoinManager.deployed();
    const watcher_created = coin_manager.Created();

    let fee = { value: web3.toWei("1", "ether") };
    await coin_manager.deploy(10, "yyy", "coin", token_reg.address, fee);

    let events_created = await watcher_created.get();
    assert.equal(events_created.length, 1);
    assert.equal(events_created[0].args.owner, accounts[0]);

    let coin = await BasicCoin.at(events_created[0].args.coin);
    const watcher_approval = coin.Approval();

    // the coin's total supply matches the one at construction
    assert.equal(10, await coin.totalSupply());

    // the total supply is the owner's balance
    assert.equal(10, await coin.balanceOf(accounts[0]));

    // transferring a coin properly adjusts the balance
    assert.equal(0, await coin.balanceOf(accounts[1]));
    await coin.transfer(accounts[1], 1);
    assert.equal(1, await coin.balanceOf(accounts[1]));
    assert.equal(9, await coin.balanceOf(accounts[0]));

    // we can approve and allowance
    await coin.approve(accounts[2], 50);
    let events_approvals = await watcher_approval.get();
    assert.equal(events_approvals[0].args.owner, accounts[0]);
    assert.equal(events_approvals[0].args.spender, accounts[2]);
    assert.equal(events_approvals[0].args.value, 50);
    assert.equal(50, await coin.allowance(accounts[0], accounts[2]));

    // and another one
    await coin.approve(accounts[3], 30);
    events_approvals = await watcher_approval.get();
    assert.equal(events_approvals[0].args.owner, accounts[0]);
    assert.equal(events_approvals[0].args.spender, accounts[3]);
    assert.equal(events_approvals[0].args.value, 30);
    assert.equal(30, await coin.allowance(accounts[0], accounts[3]));

    // we can transfer by allowance
    await coin.transferFrom(accounts[0], accounts[5], 1, { from: accounts[2] });
    assert.equal(49, await coin.allowance(accounts[0], accounts[2]));
    assert.equal(8, await coin.balanceOf(accounts[0]));
    assert.equal(1, await coin.balanceOf(accounts[5]));

    // but not more than the owner has
    await assertThrowsAsync(
      () => coin.transferFrom(accounts[0], accounts[5], 20, { from: accounts[3] }),
      "revert",
    );

    // we can not transfer when we don't have an allowance
    await assertThrowsAsync(
      () => coin.transferFrom(accounts[0], accounts[5], 20, { from: accounts[9] }),
      "revert",
    );
  });
});
