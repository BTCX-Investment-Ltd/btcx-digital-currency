// SPDX-License-Identifier: MIT
// Compatible with OpenZeppelin Contracts ^5.5.0
// SMTChecker Verification Version
pragma solidity ^0.8.27;

import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import {ERC20Permit} from "@openzeppelin/contracts/token/ERC20/extensions/ERC20Permit.sol";

/**
 * @title BTCXDigitalCurrency (SMTChecker Verification)
 * @notice This version includes SMTChecker assertions for formal verification
 * @dev Compile with: solc --model-checker-engine chc --model-checker-targets assert
 */
contract BTCXDigitalCurrency_SMTChecker is ERC20, ERC20Permit {
    /// @notice Fixed total supply constant for verification
    uint256 private constant INITIAL_SUPPLY = 1200000000 * 10 ** 18;
    
    /// @notice Emitted when the initial token supply is minted during contract deployment
    event InitialMint(address indexed recipient, uint256 amount);

    constructor(address recipient)
        ERC20("BTCX Digital Currency", "BTCX")
        ERC20Permit("BTCX Digital Currency")
    {
        uint256 initialSupply = 1200000000 * 10 ** decimals();
        _mint(recipient, initialSupply);
        emit InitialMint(recipient, initialSupply);
        
        // SMTChecker: Verify initial state
        assert(totalSupply() == INITIAL_SUPPLY);
        assert(balanceOf(recipient) == INITIAL_SUPPLY);
    }

    /**
     * @notice Override transfer with SMTChecker assertions
     */
    function transfer(address to, uint256 value) public virtual override returns (bool) {
        uint256 totalBefore = totalSupply();
        uint256 senderBefore = balanceOf(msg.sender);
        uint256 recipientBefore = balanceOf(to);
        
        bool success = super.transfer(to, value);
        
        if (success) {
            // Invariant: Total supply unchanged
            assert(totalSupply() == totalBefore);
            
            // Invariant: Conservation of tokens (for non-self transfers)
            if (msg.sender != to) {
                assert(balanceOf(msg.sender) == senderBefore - value);
                assert(balanceOf(to) == recipientBefore + value);
            }
        }
        
        return success;
    }

    /**
     * @notice Override transferFrom with SMTChecker assertions
     */
    function transferFrom(address from, address to, uint256 value) public virtual override returns (bool) {
        uint256 totalBefore = totalSupply();
        uint256 fromBefore = balanceOf(from);
        uint256 toBefore = balanceOf(to);
        
        bool success = super.transferFrom(from, to, value);
        
        if (success) {
            // Invariant: Total supply unchanged
            assert(totalSupply() == totalBefore);
            
            // Invariant: Conservation of tokens (for non-self transfers)
            if (from != to) {
                assert(balanceOf(from) == fromBefore - value);
                assert(balanceOf(to) == toBefore + value);
            }
        }
        
        return success;
    }
}
