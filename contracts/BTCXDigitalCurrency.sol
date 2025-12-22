// SPDX-License-Identifier: MIT
// Compatible with OpenZeppelin Contracts ^5.5.0
pragma solidity 0.8.27;

import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import {ERC20Burnable} from "@openzeppelin/contracts/token/ERC20/extensions/ERC20Burnable.sol";
import {ERC20Permit} from "@openzeppelin/contracts/token/ERC20/extensions/ERC20Permit.sol";

contract BTCXDigitalCurrency is ERC20, ERC20Burnable, ERC20Permit {
    /// @notice Emitted when the initial token supply is minted during contract deployment
    /// @param recipient The address receiving the initial supply
    /// @param amount The total amount of tokens minted
    event InitialMint(address indexed recipient, uint256 amount);

    constructor(address recipient)
        ERC20("BTCX Digital Currency", "BTCX")
        ERC20Permit("BTCX Digital Currency")
    {
        uint256 initialSupply = 1_200_000_000 * 10 ** decimals();
        _mint(recipient, initialSupply);
        emit InitialMint(recipient, initialSupply);
    }
}
