# BTCX Digital Currency

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Solidity](https://img.shields.io/badge/Solidity-0.8.27-blue.svg)](https://soliditylang.org/)
[![OpenZeppelin](https://img.shields.io/badge/OpenZeppelin-5.5.0-blue.svg)](https://openzeppelin.com/contracts/)

> **Official ERC20 Token for BTCX Investment Ltd**

A fixed-supply ERC20 token with EIP-2612 permit functionality, built on battle-tested OpenZeppelin contracts.

---

## Table of Contents

- [Overview](#overview)
- [Tokenomics](#tokenomics)
- [Technical Specifications](#technical-specifications)
- [Architecture](#architecture)
- [Security Model](#security-model)
- [Roles & Permissions](#roles--permissions)
- [Admin Powers](#admin-powers)
- [Pause & Recovery Logic](#pause--recovery-logic)
- [Governance](#governance)
- [Contract Functions](#contract-functions)
- [Development](#development)
- [Testing](#testing)
- [Static Analysis](#static-analysis)
- [Deployment](#deployment)
- [Audit Information](#audit-information)
- [License](#)

---

## Overview

**BTCX Digital Currency** is a simple, secure, and immutable ERC20 token designed for maximum decentralization and minimal attack surface. The contract has no owner, no admin functions, and no upgrade mechanism—making it a truly trustless token.

### Key Features

- **Fixed Supply**: 1.2 billion tokens minted at deployment, no further minting possible
- **Immutable**: No upgrade mechanism, no proxy pattern
- **Permissionless**: No owner, no admin roles, no privileged functions
- **EIP-2612 Permit**: Gasless approvals via off-chain signatures
- **Battle-Tested**: Built entirely on OpenZeppelin Contracts v5.5.0

---

## Tokenomics

| Property | Value |
|----------|-------|
| **Token Name** | BTCX Digital Currency |
| **Token Symbol** | BTCX |
| **Decimals** | 18 |
| **Total Supply** | 1,200,000,000 BTCX |
| **Initial Distribution** | 100% to specified recipient at deployment |
| **Inflation** | None (fixed supply) |
| **Deflation** | None (no burn mechanism) |

### Supply Breakdown

```
Total Supply: 1,200,000,000 BTCX (1.2 Billion)
├── Minted at deployment to recipient address
├── No vesting contracts in token contract
├── No minting function (supply is immutable)
└── No burning function (supply is preserved)
```

### Token Distribution Model

The entire token supply is minted to a single recipient address at deployment. Distribution to various stakeholders (team, Management, community, etc.) is handled externally through standard ERC20 transfers, not through the token contract itself.

---

## Technical Specifications

### Contract Details

| Property | Value |
|----------|-------|
| **Contract Name** | BTCXDigitalCurrency |
| **Solidity Version** | ^0.8.27 |
| **License** | MIT |
| **EVM Version** | Cancun |
| **Optimizer** | Enabled (200 runs) |

### Inherited Contracts

```
BTCXDigitalCurrency
├── ERC20 (OpenZeppelin v5.5.0)
│   ├── IERC20
│   ├── IERC20Metadata
│   └── Context
└── ERC20Permit (OpenZeppelin v5.5.0)
    ├── EIP712
    ├── IERC20Permit
    └── Nonces
```

### Standards Compliance

| Standard | Description | Status |
|----------|-------------|--------|
| **ERC-20** | Fungible Token Standard | ✅ Fully Compliant |
| **EIP-2612** | Permit Extension for ERC-20 | ✅ Fully Compliant |
| **EIP-712** | Typed Structured Data Hashing | ✅ Fully Compliant |

---

## Architecture

### Contract Structure

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.27;

import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import {ERC20Permit} from "@openzeppelin/contracts/token/ERC20/extensions/ERC20Permit.sol";

contract BTCXDigitalCurrency is ERC20, ERC20Permit {
    event InitialMint(address indexed recipient, uint256 amount);

    constructor(address recipient)
        ERC20("BTCX Digital Currency", "BTCX")
        ERC20Permit("BTCX Digital Currency")
    {
        uint256 initialSupply = 1200000000 * 10 ** decimals();
        _mint(recipient, initialSupply);
        emit InitialMint(recipient, initialSupply);
    }
}
```

### Design Philosophy

1. **Simplicity**: Minimal code surface reduces potential vulnerabilities
2. **Immutability**: No upgrade patterns, no proxy contracts
3. **Decentralization**: No privileged roles or admin functions
4. **Composability**: Standard ERC20 interface for DeFi integration

### State Variables

The contract has **no custom state variables**. All state is managed by inherited OpenZeppelin contracts:

| Variable | Location | Description |
|----------|----------|-------------|
| `_balances` | ERC20 | Mapping of address to token balance |
| `_allowances` | ERC20 | Mapping of owner to spender allowances |
| `_totalSupply` | ERC20 | Total token supply |
| `_name` | ERC20 | Token name |
| `_symbol` | ERC20 | Token symbol |
| `_nonces` | Nonces | Mapping of address to permit nonce |

---

## Security Model

### Trust Assumptions

| Assumption | Description |
|------------|-------------|
| **OpenZeppelin** | Inherited contracts are secure and audited |
| **Solidity Compiler** | Compiler version 0.8.27 is free of critical bugs |
| **EVM** | Ethereum Virtual Machine behaves as specified |

### Attack Surface Analysis

| Attack Vector | Mitigation |
|---------------|------------|
| **Reentrancy** | No external calls in state-changing functions |
| **Integer Overflow** | Solidity 0.8+ built-in overflow checks |
| **Access Control** | No privileged functions exist |
| **Front-running** | Standard ERC20 behavior; users should use permit or increaseAllowance patterns |
| **Signature Replay** | Nonce-based replay protection in EIP-2612 |
| **Signature Malleability** | OpenZeppelin's ECDSA library handles this |

### Security Features

1. **No External Calls**: Contract makes no external calls, eliminating reentrancy risks
2. **No Delegatecall**: No proxy pattern, no delegatecall vulnerabilities
3. **No Selfdestruct**: Contract cannot be destroyed
4. **Overflow Protection**: Solidity 0.8+ automatic overflow/underflow checks
5. **Permit Nonces**: Sequential nonces prevent signature replay attacks

---

## Roles & Permissions

### Role Summary

| Role | Exists | Description |
|------|--------|-------------|
| **Owner** | ❌ No | No owner role |
| **Admin** | ❌ No | No admin role |
| **Minter** | ❌ No | No minting capability after deployment |
| **Burner** | ❌ No | No burning capability |
| **Pauser** | ❌ No | No pause capability |

### Permission Matrix

| Function | Anyone | Token Holder | Approved Spender |
|----------|--------|--------------|------------------|
| `transfer` | - | ✅ | - |
| `approve` | ✅ | ✅ | - |
| `transferFrom` | - | - | ✅ |
| `permit` | ✅ | ✅ | - |
| `balanceOf` | ✅ | ✅ | ✅ |
| `allowance` | ✅ | ✅ | ✅ |

---

## Admin Powers

### Summary: **NONE**

This contract has been intentionally designed with **zero administrative powers**:

- ❌ **No owner**: No `Ownable` inheritance
- ❌ **No minting**: No `mint()` function
- ❌ **No burning**: No `burn()` function
- ❌ **No pausing**: No `Pausable` inheritance
- ❌ **No blacklisting**: No address restriction mechanism
- ❌ **No fee modification**: No transfer fees or fee adjustment
- ❌ **No upgradeability**: No proxy pattern
- ❌ **No recovery**: No token recovery mechanism

### Implications

| Scenario | Outcome |
|----------|---------|
| Tokens sent to wrong address | **Irrecoverable** - No admin can recover |
| Tokens sent to contract address | **Irrecoverable** - No admin can recover |
| Private key compromise | **User responsibility** - No admin can freeze |
| Regulatory request to freeze | **Impossible** - No freeze mechanism |
| Bug discovered post-deployment | **Immutable** - Cannot be patched |

---

## Pause & Recovery Logic

### Pause Functionality: **NOT IMPLEMENTED**

This contract does **not** include pause functionality. This is an intentional design decision:

**Rationale:**
- Maximizes decentralization
- Eliminates single point of failure
- Prevents censorship
- Reduces attack surface

**Implications:**
- Token transfers cannot be halted
- No emergency stop mechanism
- Contract operates continuously and autonomously

### Recovery Logic: **NOT IMPLEMENTED**

This contract does **not** include token recovery functionality:

**Rationale:**
- Prevents admin abuse
- Maintains trustlessness
- Follows Bitcoin's philosophy of self-custody

**Implications:**
- Tokens sent to the contract address are permanently locked
- No mechanism to recover tokens sent in error
- Users bear full responsibility for transaction accuracy

---

## Governance

### On-Chain Governance: **NOT IMPLEMENTED**

This contract does not include on-chain governance mechanisms:

- ❌ No voting functionality
- ❌ No proposal system
- ❌ No timelock
- ❌ No parameter changes possible

### Governance Model

The BTCX token follows a **"code is law"** governance model:

| Aspect | Description |
|--------|-------------|
| **Contract Governance** | Immutable - no changes possible |
| **Token Distribution** | Managed externally by recipient |
| **Protocol Decisions** | Off-chain coordination |
| **Upgrades** | Requires new contract deployment |

### Future Governance Considerations

If governance is needed for the BTCX ecosystem:

1. **Snapshot Voting**: Off-chain voting using token balances as voting power
2. **Multisig Treasury**: Gnosis Safe for ecosystem fund management
3. **Governor Contract**: Separate governance contract (not affecting token)

---

## Contract Functions

### Write Functions

| Function | Parameters | Description |
|----------|------------|-------------|
| `transfer` | `to`, `value` | Transfer tokens to address |
| `approve` | `spender`, `value` | Approve spender allowance |
| `transferFrom` | `from`, `to`, `value` | Transfer using allowance |
| `permit` | `owner`, `spender`, `value`, `deadline`, `v`, `r`, `s` | Gasless approval via signature |

### Read Functions

| Function | Returns | Description |
|----------|---------|-------------|
| `name()` | `string` | Token name: "BTCX Digital Currency" |
| `symbol()` | `string` | Token symbol: "BTCX" |
| `decimals()` | `uint8` | Decimal places: 18 |
| `totalSupply()` | `uint256` | Total supply: 1.2B * 10^18 |
| `balanceOf(address)` | `uint256` | Token balance of address |
| `allowance(address,address)` | `uint256` | Spender allowance |
| `nonces(address)` | `uint256` | Current permit nonce |
| `DOMAIN_SEPARATOR()` | `bytes32` | EIP-712 domain separator |
| `eip712Domain()` | `tuple` | Full EIP-712 domain info |

### Events

| Event | Parameters | Description |
|-------|------------|-------------|
| `Transfer` | `from`, `to`, `value` | Emitted on token transfer |
| `Approval` | `owner`, `spender`, `value` | Emitted on approval |
| `InitialMint` | `recipient`, `amount` | Emitted once at deployment |

---

## Development

### Prerequisites

- Node.js >= 18.0.0
- npm or yarn

### Installation

```bash
# Clone repository
git clone https://github.com/BTCX-Investment-Ltd/btcx-digital-currency.git
cd btcx-digital-currency

# Install dependencies
npm install
```

### Project Structure

```
btcx-digital-currency/
├── contracts/
│   └── BTCXDigitalCurrency.sol    # Main token contract
├── test/
│   └── BTCXDigitalCurrency.test.js # Comprehensive test suite
├── scripts/
│   └── deploy.js                   # Deployment script
├── hardhat.config.js               # Hardhat configuration
├── slither.config.json             # Slither analysis config
├── package.json                    # Dependencies
└── README.md                       # This file
```

### Compile

```bash
npm run compile
```

---

## Testing

### Run Tests

```bash
# Run all tests
npm test

# Run with verbose output
npm run test:verbose

# Run with gas reporting
REPORT_GAS=true npm test
```

### Test Coverage

```bash
# Generate coverage report
npm run coverage

# View HTML report
open coverage/index.html
```

### Test Categories

| Category | Tests | Description |
|----------|-------|-------------|
| **Deployment** | 8 | Constructor, initial state, events |
| **ERC20 Basic** | 5 | balanceOf, totalSupply |
| **Transfer** | 10 | transfer functionality, edge cases |
| **Approval** | 7 | approve functionality |
| **TransferFrom** | 9 | transferFrom functionality |
| **ERC20 Permit** | 12 | EIP-2612 permit functionality |
| **Integration** | 3 | Combined functionality tests |
| **Edge Cases** | 6 | Boundary conditions, security |
| **Gas Optimization** | 3 | Gas usage verification |
| **View Functions** | 5 | Read-only function tests |

**Total: 68+ test cases**

---

## Static Analysis

### Slither Analysis

```bash
# Install Slither
pip install slither-analyzer

# Run analysis
npm run slither

# Generate JSON report
npm run slither:report
```

### Expected Findings

The contract is designed to produce minimal findings:

| Severity | Expected Count | Notes |
|----------|----------------|-------|
| High | 0 | None expected |
| Medium | 0 | None expected |
| Low | 0-1 | Possible informational about decimals() |
| Informational | 1-3 | Standard OpenZeppelin patterns |

### MythX Analysis (Optional)

```bash
# Install MythX CLI
pip install mythx-cli

# Run analysis (requires API key)
mythx analyze contracts/BTCXDigitalCurrency.sol
```

---

## Deployment

### Local Deployment

```bash
# Start local node
npm run node

# Deploy to local network
npm run deploy:local
```

### Testnet Deployment (Sepolia)

```bash
# Set environment variables
cp .env.example .env
# Edit .env with your values

# Deploy
npm run deploy:sepolia
```

### Mainnet Deployment

```bash
# Ensure .env is configured for mainnet
npm run deploy:mainnet

# Verify on Etherscan
npx hardhat verify --network mainnet <CONTRACT_ADDRESS> "<RECIPIENT_ADDRESS>"
```

### Deployment Checklist

- [ ] Verify recipient address is correct
- [ ] Ensure sufficient ETH for gas
- [ ] Double-check network configuration
- [ ] Prepare for contract verification
- [ ] Document deployment transaction hash
- [ ] Verify token appears correctly on Etherscan

---

## Audit Information

### Audit Preparation Package

This repository includes all materials required for a comprehensive security audit:

| Item | Location | Description |
|------|----------|-------------|
| **Source Code** | `contracts/` | Solidity source files |
| **Test Suite** | `test/` | Comprehensive test coverage |
| **Coverage Report** | `coverage/` | Generated via `npm run coverage` |
| **Static Analysis** | `slither-report.json` | Generated via `npm run slither:report` |
| **Documentation** | `README.md` | This technical documentation |

### Generating Audit Reports

```bash
# Generate all audit materials
npm run audit:prepare

# This runs:
# 1. Full test suite with coverage
# 2. Slither static analysis with JSON output
```

### Contract Complexity

| Metric | Value |
|--------|-------|
| **Lines of Code** | ~23 (excluding comments) |
| **Cyclomatic Complexity** | 1 (minimal branching) |
| **External Dependencies** | OpenZeppelin v5.5.0 only |
| **Custom Logic** | Constructor only |

### Known Considerations

1. **No Zero Address Check**: The original contract does not validate `recipient != address(0)` in constructor. OpenZeppelin's `_mint` will revert if minting to zero address.

2. **Permit Deadline**: Users should set reasonable deadlines for permit signatures to minimize exposure window.

3. **Approval Race Condition**: Standard ERC20 approval race condition exists. Users should use `permit` or set allowance to 0 before changing to new value.

---

## License

```
SPDX-License-Identifier: MIT
```

---

## Contact

**BTCX Investment Ltd**

- Website: [https://btcx.investments](https://btcx.investments)
- GitHub: [https://github.com/BTCX-Investment-Ltd](https://github.com/BTCX-Investment-Ltd)

---
