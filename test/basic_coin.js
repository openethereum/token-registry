"use strict";

const { assertThrowsAsync } = require("./utils.js");

const TokenReg = artifacts.require("TokenReg");
const BasicCoin = artifacts.require("BasicCoin");

contract("BasicCoin", accounts => {

  let _basicCoin;
  const basicCoin = async () => {
    if (_basicCoin === undefined) {
      _basicCoin = await BasicCoin.new(10, accounts[0]);
    }

    return _basicCoin;
  };

  it("can be deployed with configurable total supply", async () => {
    const coin = await basicCoin();

    // coin has an owner
    const owner = await coin.owner();
    assert.equal(owner, accounts[0]);

    // the coin's total supply matches the one at construction
    const totalSupply = await coin.totalSupply();
    assert.equal(totalSupply, 10);

    // the total supply is the owner's balance
    const balance = await coin.balanceOf(accounts[0]);
    assert.equal(balance, 10);

    // total supply must be non-zero
    await assertThrowsAsync(
      () => BasicCoin.new(0, accounts[0]),
      "revert",
    );
  });


  it("allows transfering coins", async () => {
    const coin = await basicCoin();
    const watcher = coin.Transfer();

    // transferring a coin properly adjusts the balance
    assert.equal(0, await coin.balanceOf(accounts[1]));
    await coin.transfer(accounts[1], 1);
    assert.equal(1, await coin.balanceOf(accounts[1]));
    assert.equal(9, await coin.balanceOf(accounts[0]));

    // it should emit a `Transfer` event
    const events = await watcher.get();

    assert.equal(events.length, 1);
    assert.equal(events[0].args.from, accounts[0]);
    assert.equal(events[0].args.to, accounts[1]);
    assert.equal(events[0].args.value, 1);

    // validates required balance for transfer
    await assertThrowsAsync(
      () => coin.transfer(accounts[1], 1000),
      "revert",
    );
  });

  it("allows setting an allowance per address", async () => {
    const coin = await basicCoin();
    const watcher = coin.Approval();

    // we can approve an allowance
    await coin.approve(accounts[2], 50);

    // it should emit a `Approval` event
    let events = await watcher.get();
    assert.equal(events[0].args.owner, accounts[0]);
    assert.equal(events[0].args.spender, accounts[2]);
    assert.equal(events[0].args.value, 50);

    assert.equal(50, await coin.allowance(accounts[0], accounts[2]));

    // and another one
    await coin.approve(accounts[3], 5);

    events = await watcher.get();
    assert.equal(events[0].args.owner, accounts[0]);
    assert.equal(events[0].args.spender, accounts[3]);
    assert.equal(events[0].args.value, 5);

    assert.equal(5, await coin.allowance(accounts[0], accounts[3]));
  });

  it("allows transfering from the allowance", async () => {
    const coin = await basicCoin();
    const watcher = coin.Transfer();

    // we can transfer by allowance
    await coin.transferFrom(accounts[0], accounts[5], 1, { from: accounts[2] });
    assert.equal(49, await coin.allowance(accounts[0], accounts[2]));
    assert.equal(8, await coin.balanceOf(accounts[0]));
    assert.equal(1, await coin.balanceOf(accounts[5]));

    // but not more than the owner has
    await assertThrowsAsync(
      () => coin.transferFrom(accounts[0], accounts[2], 20, { from: accounts[3] }),
      "revert",
    );

    // we can not transfer when we don't have an allowance
    await assertThrowsAsync(
      () => coin.transferFrom(accounts[0], accounts[5], 5, { from: accounts[9] }),
      "revert",
    );
  });

  it("should allow the owner of the coin to transfer ownership", async () => {
    const coin = await basicCoin();
    const watcher = coin.NewOwner();

    // only the owner of the coin can transfer ownership
    await assertThrowsAsync(
      () => coin.setOwner(accounts[1], { from: accounts[1] }),
      "revert",
    );

    let owner = await coin.owner();
    assert.equal(owner, accounts[0]);

    // we successfully transfer ownership of the coin
    await coin.setOwner(accounts[1]);

    // the `owner` should point to the new owner
    owner = await coin.owner();
    assert.equal(owner, accounts[1]);

    // it should emit a `NewOwner` event
    const events = await watcher.get();

    assert.equal(events.length, 1);
    assert.equal(events[0].args.old, accounts[0]);
    assert.equal(events[0].args.current, accounts[1]);

    // the old owner can no longer set a new owner
    await assertThrowsAsync(
      () => coin.setOwner(accounts[0], { from: accounts[0] }),
      "revert",
    );
  });
});
