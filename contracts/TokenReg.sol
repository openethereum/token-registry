//! The token-registry contract.
//!
//! Copyright 2017 Gavin Wood, Parity Technologies Ltd.
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

pragma solidity ^0.4.0;

import "./Owned.sol";

contract TokenReg is Owned {
	struct Token {
		address addr;
		string tla;
		uint base;
		string name;
		address owner;
		mapping (bytes32 => bytes32) meta;
	}

	event Registered(string indexed tla, uint indexed id, address addr, string name);
	event Unregistered(string indexed tla, uint indexed id);
	event MetaChanged(uint indexed id, bytes32 indexed key, bytes32 value);

	mapping (address => uint) mapFromAddress;
	mapping (string => uint) mapFromTLA;
	Token[] tokens;
	uint public fee = 1 ether;

	modifier whenFeePaid {
		if (msg.value < fee)
			return;
		_;
	}

	modifier whenAddressFree(address _addr) {
		if (mapFromAddress[_addr] != 0)
			return;
		_;
	}

	modifier whenTlaFree(string _tla) {
		if (mapFromTLA[_tla] != 0)
			return;
		_;
	}

	modifier whenIsTla(string _tla) {
		if (bytes(_tla).length != 3)
			return;
		_;
	}

	modifier whenHasTla(string _tla) {
		if (mapFromTLA[_tla] == 0)
			return;
		_;
	}

	modifier onlyTokenOwner(uint _id) {
		if (tokens[_id].owner != msg.sender)
			return;
		_;
	}

	function register(address _addr, string _tla, uint _base, string _name)
		public
		payable
		returns (bool)
	{
		return registerAs(_addr, _tla, _base, _name, msg.sender);
	}

	function registerAs(address _addr, string _tla, uint _base, string _name, address _owner)
		public
		payable
		whenFeePaid
		whenAddressFree(_addr)
		whenIsTla(_tla)
		whenTlaFree(_tla)
		returns (bool)
	{
		tokens.push(Token(_addr, _tla, _base, _name, _owner));
		mapFromAddress[_addr] = tokens.length;
		mapFromTLA[_tla] = tokens.length;
		emit Registered(_tla, tokens.length - 1, _addr, _name);
		return true;
	}

	function unregister(uint _id)
		public
		onlyOwner
	{
		emit Unregistered(tokens[_id].tla, _id);
		delete mapFromAddress[tokens[_id].addr];
		delete mapFromTLA[tokens[_id].tla];
		delete tokens[_id];
	}

	function setFee(uint _fee)
		public
		onlyOwner
	{
		fee = _fee;
	}

	function tokenCount()
		public
		view
		returns (uint)
	{
		return tokens.length;
	}

	function token(uint _id)
		public
		view
		returns (address addr, string tla, uint base, string name, address owner)
	{
		Token storage t = tokens[_id];
		addr = t.addr;
		tla = t.tla;
		base = t.base;
		name = t.name;
		owner = t.owner;
	}

	function fromAddress(address _addr)
		public
		view
		returns (uint id, string tla, uint base, string name, address owner)
	{
		id = mapFromAddress[_addr] - 1;
		Token storage t = tokens[id];
		tla = t.tla;
		base = t.base;
		name = t.name;
		owner = t.owner;
	}

	function fromTLA(string _tla)
		public
		view
		returns (uint id, address addr, uint base, string name, address owner)
	{
		id = mapFromTLA[_tla] - 1;
		Token storage t = tokens[id];
		addr = t.addr;
		base = t.base;
		name = t.name;
		owner = t.owner;
	}

	function meta(uint _id, bytes32 _key)
		public
		view
		returns (bytes32)
	{
		return tokens[_id].meta[_key];
	}

	function setMeta(uint _id, bytes32 _key, bytes32 _value)
		public
		onlyTokenOwner(_id)
	{
		tokens[_id].meta[_key] = _value;
		emit MetaChanged(_id, _key, _value);
	}

	function drain()
		public
		onlyOwner
	{
		msg.sender.transfer(address(this).balance);
	}
}
