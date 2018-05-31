"use strict";

const TokenReg = artifacts.require("TokenReg");

contract("TokenReg", accounts => {

  it("has an initial token count of 0", async () => {
    const token_reg = await TokenReg.deployed();
    let result = await token_reg.tokenCount();
    assert.equal(0, result);
  });


  it("should not register without paid fee", async () => {
    const token_reg = await TokenReg.deployed();
    let result = await token_reg.register.call(accounts[0], "abc", 10, "name");
    assert.isFalse(result);
  });


  it("should allow registering a token", async () => {
    const token_reg = await TokenReg.deployed();
    const watcher_registered = token_reg.Registered();
    const watcher_unregistered = token_reg.Unregistered();

    // initially, no tokens have been issued
    let count1 = await token_reg.tokenCount();
    assert.equal(0, count1.toNumber());

    // register some token
    let fee = { value: web3.toWei("1", "ether") };

    // check that registering will succeed
    let can_register = await token_reg.register.call(accounts[0], "def", 10, "name", fee);
    assert(can_register);

    // perform registration
    await token_reg.register(accounts[0], "def", 10, "name", fee);

    let events_reg = await watcher_registered.get();
    assert.equal(events_reg.length, 1);
    assert.equal(events_reg[0].args.name, "name");
    assert.equal(events_reg[0].args.addr, accounts[0]);

    // token count has increased by 1
    assert.equal(await token_reg.tokenCount(), 1);

    let token_id = events_reg[0].args.id;

    // can lookup token by its id
    let token = await token_reg.token(token_id);
    assert.equal(token[0], accounts[0]);
    assert.equal(token[1], "def");
    assert.equal(token[2], 10);
    assert.equal(token[3], "name");

    // can lookup by address
    let token_id2 = await token_reg.fromAddress(accounts[0]);
    assert.equal(token_id.toNumber(), token_id2[0].toNumber());

    // can lookup by TLA
    let token_id3 = await token_reg.fromTLA("def");
    assert.equal(token_id.toNumber(), token_id3[0].toNumber());

    // can attach meta data to token
    await token_reg.setMeta(token_id, "k", "v");
    let value = await token_reg.meta(token_id, "k");
    assert.equal(web3.toAscii(value)[0], "v");

    // no one but the owner can unregister tokens
    let impersonator = { from: accounts[7] };
    let exception_caught = false;
    try {
      await token_reg.unregister(token_id, impersonator);
    } catch (_) {
      exception_caught = true;
    }
    assert(exception_caught);

    // owner can unregister tokens
    await token_reg.unregister(token_id);
    let events_unreg = await watcher_unregistered.get();
    assert.equal(events_unreg.length, 1);

    // now token count has decreased by 1
    let count2 = await token_reg.tokenCount();
    assert.equal(count2.toNumber(), 0);

    // id no longer maps to our token
    exception_caught = false;
    try {
      await token_reg.token(token_id);
    } catch (_) {
      exception_caught = true;
    }
    assert(exception_caught);
  });


  it("should allow registering a token only once per address", async () => {
    const token_reg = await TokenReg.deployed();
    const watcher_registered = token_reg.Registered();

    let fee = { value: web3.toWei("1", "ether") };

    await token_reg.register(accounts[1], "ghi", 10, "name", fee);
    let events_reg1 = await watcher_registered.get();
    assert.equal(events_reg1.length, 1);

    await token_reg.register(accounts[1], "jkl", 10, "name", fee);
    let events_reg2 = await watcher_registered.get();
    assert.equal(events_reg2.length, 0);
  });


  it("should allow registering a token only once per TLA", async () => {
    const token_reg = await TokenReg.deployed();
    const watcher_registered = token_reg.Registered();

    let fee = { value: web3.toWei("1", "ether") };

    await token_reg.register(accounts[2], "mno", 10, "name", fee);
    let events_reg1 = await watcher_registered.get();
    assert.equal(events_reg1.length, 1);

    await token_reg.register(accounts[3], "pqr", 10, "name", fee);
    let events_reg2 = await watcher_registered.get();
    assert.equal(events_reg2.length, 1);

    await token_reg.register(accounts[4], "mno", 10, "name", fee);
    let events_reg3 = await watcher_registered.get();
    assert.equal(events_reg3.length, 0);
  });


  it("should not allow registering a token with invalid TLA", async () => {
    const token_reg = await TokenReg.deployed();
    const watcher_registered = token_reg.Registered();

    let fee = { value: web3.toWei("1", "ether") };

    await token_reg.register(accounts[5], "sdfsdfsdf", 10, "name", fee);
    let events_reg1 = await watcher_registered.get();
    assert.equal(events_reg1.length, 0);
  });


  it("checks for token ownership", async () => {
    const token_reg = await TokenReg.deployed();
    const watcher_registered = token_reg.Registered();

    let fee = { value: web3.toWei("1", "ether") };

    await token_reg.register(accounts[6], "stu", 10, "name", fee);
    let events_reg1 = await watcher_registered.get();
    assert.equal(events_reg1.length, 1);
    let token_id = events_reg1[0].args.id;

    let impersonator = { from: accounts[7] };

    await token_reg.setMeta(token_id, "k", "v", impersonator);
    let value = await token_reg.meta(token_id, "k");
    assert.notEqual(web3.toAscii(value)[0], "v");
  });


  it("can set different fee price", async () => {
    const token_reg = await TokenReg.deployed();
    let current_fee = await token_reg.fee();
    assert.equal(web3.toWei("1", "ether"), current_fee.toNumber());
    await token_reg.setFee(web3.toWei("2", "ether"));
    let new_fee = await token_reg.fee();
    assert.equal(web3.toWei("2", "ether"), new_fee.toNumber());
  });


  it("allows the owner to drain the token registry", async () => {
    const token_reg = await TokenReg.deployed();

    // if not owner of the token registry, we can not drain the ether
    let exception_caught = false;
    try {
      await token_reg.drain({ from: accounts[9] });
    } catch (_) {
      exception_caught = true;
    }
    assert(exception_caught);

    let balance1 = web3.eth.getBalance(accounts[0]);
    await token_reg.drain({ from: accounts[0] });

    let balance2 = web3.eth.getBalance(accounts[0]);
    assert(balance2.gte(balance1.plus(web3.toBigNumber(web3.toWei("0.99", "ether")))));
  });

});

