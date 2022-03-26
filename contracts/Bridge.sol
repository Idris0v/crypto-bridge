// SPDX-License-Identifier: MIT
pragma solidity ^0.8.9;

import "./Air.sol";

contract Bridge {
    address public immutable validator;
    address public immutable owner;
    uint8 private chainId;
    uint private nonce;

    mapping(uint8 => bool) public supportedChains;
    mapping(address => mapping(address=> bool)) public supportedTokens;

    event SwapInitialized(address indexed initiator, address indexed tokenFrom, address indexed tokenTo, uint amount, uint8 chainFrom, uint8 chainTo, uint nonce);

    constructor(address _validator, uint8 _chainId) {
        validator = _validator;
        owner = msg.sender;
        chainId = _chainId;
    }

    function swap(uint8 chainTo, address tokenFrom, address tokenTo, uint amount) external {
        require(supportedChains[chainTo], "Unsupported chain");
        require(supportedTokens[tokenFrom][tokenTo], "Unsupported token");
        nonce += 1;
        Air(tokenFrom).burnFrom(msg.sender, amount);
        emit SwapInitialized(msg.sender, tokenFrom, tokenTo, amount, chainId, chainTo, nonce);
    }

    function redeem(address to, uint8 chainFrom, address tokenFrom, address tokenTo, uint amount, uint _nonce, uint8 v, bytes32 r, bytes32 s) external {
        require(supportedChains[chainFrom], "Unsupported chain");
        bool checkSucc = checkSign(to, tokenFrom, tokenTo, amount, chainFrom, _nonce, v, r, s);
        require(checkSucc, "checkSign failed");
        Air(tokenTo).mint(to, amount);
    }

    function checkSign(address addr, address tokenFrom, address tokenTo, uint amount, uint8 chainFrom, uint _nonce, uint8 v, bytes32 r, bytes32 s) internal view returns (bool) {
        bytes32 message = keccak256(abi.encodePacked(addr, tokenFrom, tokenTo, amount, chainFrom, chainId, _nonce));
        bytes memory prefix = "\x19Ethereum Signed Message:\n32";
        address recovered = ecrecover(keccak256(abi.encodePacked(prefix, message)), v, r, s);
        return recovered == validator;
    }

    function updateChainById(uint8 _chainId, bool supported) external {
        require(msg.sender == owner, "Not allowed");
        supportedChains[_chainId] = supported;
    }

    function updatePair(address tokenFrom, address tokenTo, bool supported) external {
        require(msg.sender == owner, "Not allowed");
        supportedTokens[tokenFrom][tokenTo] = supported;
    }
}