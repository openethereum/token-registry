//! The basic-coin ECR20-compliant token contract.
//!
//! Copyright 2016 Gavin Wood, Parity Technologies Ltd.
//!
//! Licensed under the Apache License, Version 2.0 (the "License");
//! you may not use this file except in compliance with the License.
//! You may obtain a copy of the License at
//!
//!     http://www.apache.org/licenses/LICENSE-2.0
//!
//! Unless required by applicable law or agreed to in writing, software
//! distributed under the License is distributed on an "AS IS" BASIS,
//! WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
//! See the License for the specific language governing permissions and
//! limitations under the License.

pragma solidity ^0.4.1;

import "./Owned.sol";
import "./Token.sol";
import "./TokenReg.sol";

// BasicCoin, ECR20 tokens that all belong to the owner for sending around
contract BasicCoin is Owned, Token {
	// this is as basic as can be, only the associated balance & allowances
	struct Account {
		uint balance;
		mapping (address => uint) allowanceOf;
	}

	// the base, tokens denoted in micros
	uint constant public BASE = 1000000;

	// available token supply
	uint public totalSupply;

	// storage and mapping of all balances & allowances
	mapping (address => Account) accounts;

	// the balance should be available
	modifier whenOwns(address _owner, uint _amount) {
		require(accounts[_owner].balance >= _amount);
		_;
	}

	// an allowance should be available
	modifier whenHasAllowance(address _owner, address _spender, uint _amount) {
		require(accounts[_owner].allowanceOf[_spender] >= _amount);
		_;
	}

	// no ETH should be sent with the transaction
	modifier whenNoEth {
		require(msg.value == 0);
		_;
	}

	// a value should be > 0
	modifier whenNonZero(uint _value) {
		require(_value > 0);
		_;
	}

	// constructor sets the parameters of execution, _totalSupply is all units
	constructor(uint _totalSupply, address _owner)
		public
		whenNonZero(_totalSupply)
	{
		// Non payable function. No need to check msg.value.

		totalSupply = _totalSupply;
		owner = _owner;
		accounts[_owner].balance = totalSupply;
	}

	// balance of a specific address
	function balanceOf(address _who)
		public
		view
		returns (uint256)
	{
		return accounts[_who].balance;
	}

	// transfer
	function transfer(address _to, uint256 _value)
		public
		whenNoEth
		whenOwns(msg.sender, _value)
		returns (bool)
	{
		emit Transfer(msg.sender, _to, _value);
		accounts[msg.sender].balance -= _value;
		accounts[_to].balance += _value;

		return true;
	}

	// transfer via allowance
	function transferFrom(address _from, address _to, uint256 _value)
		public
		whenNoEth
		whenOwns(_from, _value)
		whenHasAllowance(_from, msg.sender, _value)
		returns (bool)
	{
		emit Transfer(_from, _to, _value);
		accounts[_from].allowanceOf[msg.sender] -= _value;
		accounts[_from].balance -= _value;
		accounts[_to].balance += _value;

		return true;
	}

	// approve allowances
	function approve(address _spender, uint256 _value)
		public
		whenNoEth
		returns (bool)
	{
		emit Approval(msg.sender, _spender, _value);
		accounts[msg.sender].allowanceOf[_spender] += _value;

		return true;
	}

	// available allowance
	function allowance(address _owner, address _spender)
		public
		view
		returns (uint256)
	{
		return accounts[_owner].allowanceOf[_spender];
	}
}


// Manages BasicCoin instances, including the deployment & registration
contract BasicCoinManager is Owned {
	// a structure wrapping a deployed BasicCoin
	struct Coin {
		address coin;
		address owner;
		address tokenreg;
	}

	// a new BasicCoin has been deployed
	event Created(address indexed owner, address indexed tokenreg, address indexed coin);

	// a list of all the deployed BasicCoins
	Coin[] coins;

	// all BasicCoins for a specific owner
	mapping (address => uint[]) ownedCoins;

	// the base, tokens denoted in micros (matches up with BasicCoin interface above)
	uint constant public BASE = 1000000;

	// return the number of deployed
	function count()
		public
		view
		returns (uint)
	{
		return coins.length;
	}

	// get a specific deployment
	function get(uint _index)
		public
		view
		returns (address coin, address owner, address tokenreg)
	{
		Coin storage c = coins[_index];
		coin = c.coin;
		owner = c.owner;
		tokenreg = c.tokenreg;
	}

	// returns the number of coins for a specific owner
	function countByOwner(address _owner)
		public
		view
		returns (uint)
	{
		return ownedCoins[_owner].length;
	}

	// returns a specific index by owner
	function getByOwner(address _owner, uint _index)
		public
		view
		returns (address coin, address owner, address tokenreg)
	{
		return get(ownedCoins[_owner][_index]);
	}

	// deploy a new BasicCoin on the blockchain
	function deploy(uint _totalSupply, string _tla, string _name, address _tokenreg)
		public
		payable
		returns (bool)
	{
		TokenReg tokenreg = TokenReg(_tokenreg);
		BasicCoin coin = new BasicCoin(_totalSupply, msg.sender);

		uint ownerCount = countByOwner(msg.sender);
		uint fee = tokenreg.fee();

		ownedCoins[msg.sender].length = ownerCount + 1;
		ownedCoins[msg.sender][ownerCount] = coins.length;
		coins.push(Coin(coin, msg.sender, tokenreg));
		tokenreg.registerAs.value(fee)(coin, _tla, BASE, _name, msg.sender);

		emit Created(msg.sender, tokenreg, coin);

		return true;
	}

	// owner can withdraw all collected funds
	function drain()
		public
		onlyOwner
	{
		msg.sender.transfer(address(this).balance);
	}
}
