"use strict";

const TokenReg = artifacts.require("TokenReg");
const BasicCoin = artifacts.require("BasicCoin");
const BasicCoinManager = artifacts.require("BasicCoinManager");

contract("BasicCoinManager", accounts => {

  it("manager can deploy new coin", async () => {
    const token_reg = await TokenReg.deployed();
    const coin_manager = await BasicCoinManager.deployed();
    const watcher_created = coin_manager.Created();

    let fee = { value: web3.toWei("1", "ether") };

    // check that we can deploy
    let can_deploy = await coin_manager.deploy.call(10, "zzz", "coin1", token_reg.address, fee);
    assert(can_deploy);

    // and do the deployment
    assert.equal(0, await coin_manager.count());
    await coin_manager.deploy(10, "zzz", "coin1", token_reg.address, fee);
    assert.equal(1, await coin_manager.count());
    assert.equal(1, await coin_manager.countByOwner(accounts[0]));
    assert.equal(0, await coin_manager.countByOwner(accounts[9]));

    let events_created = await watcher_created.get();
    assert.equal(events_created.length, 1);
    assert.equal(events_created[0].args.owner, accounts[0]);

    let coin = events_created[0].args.coin;
    let basic_coin = await BasicCoin.at(coin);

    // the coin belongs to us
    assert.equal(accounts[0], await basic_coin.owner());

    // we can get it by index
    let get_coin = await coin_manager.get(0);
    assert.equal(coin, get_coin[0]);
    assert.equal(accounts[0], get_coin[1]);
    assert.equal(token_reg.address, get_coin[2]);

    // we can get it by owner
    let by_owner = await coin_manager.getByOwner(accounts[0], 0);
    assert.equal(coin, by_owner[0]);
    assert.equal(accounts[0], by_owner[1]);
    assert.equal(token_reg.address, by_owner[2]);
  });

  it("allows the owner to drain the coin manager", async () => {
    const token_reg = await TokenReg.deployed();
    const coin_manager = await BasicCoinManager.deployed();

    let fee = { value: web3.toWei("1", "ether") };
    await coin_manager.deploy(10, "hdl", "coin1", token_reg.address, fee);

    // if not owner of the coin manager, we can not drain the ether
    let exception_caught = false;
    try {
      await coin_manager.drain({ from: accounts[9] });
    } catch (_) {
      exception_caught = true;
    }
    assert(exception_caught);

    let balance1 = web3.eth.getBalance(accounts[0]);
    await coin_manager.drain({ from: accounts[0] });

    let balance2 = web3.eth.getBalance(accounts[8]);
    assert(balance2.gte(balance1.plus(web3.toBigNumber(web3.toWei("0.99", "ether")))));
  });

});

