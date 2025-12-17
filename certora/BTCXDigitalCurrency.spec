/*
 * BTCX Digital Currency - Formal Verification Specification
 * Framework: Certora Prover
 * 
 * This specification formally verifies critical invariants and properties
 * of the BTCXDigitalCurrency ERC20 token contract.
 */

// ============================================================
// METHODS DECLARATIONS
// ============================================================

methods {
    // ERC20 Standard
    function totalSupply() external returns (uint256) envfree;
    function balanceOf(address) external returns (uint256) envfree;
    function allowance(address, address) external returns (uint256) envfree;
    function transfer(address, uint256) external returns (bool);
    function approve(address, uint256) external returns (bool);
    function transferFrom(address, address, uint256) external returns (bool);
    
    // ERC20Burnable
    function burn(uint256) external;
    function burnFrom(address, uint256) external;
    
    // ERC20 Metadata
    function name() external returns (string memory) envfree;
    function symbol() external returns (string memory) envfree;
    function decimals() external returns (uint8) envfree;
    
    // ERC20 Permit
    function nonces(address) external returns (uint256) envfree;
    function DOMAIN_SEPARATOR() external returns (bytes32) envfree;
    function permit(address, address, uint256, uint256, uint8, bytes32, bytes32) external;
}

// ============================================================
// GHOST VARIABLES & HOOKS
// ============================================================

// Ghost variable to track sum of all balances
ghost mathint sumOfBalances {
    init_state axiom sumOfBalances == 0;
}

// Hook to update ghost on balance changes
hook Sstore _balances[KEY address account] uint256 newValue (uint256 oldValue) {
    sumOfBalances = sumOfBalances + newValue - oldValue;
}

// ============================================================
// INVARIANTS
// ============================================================

/**
 * @title Total Supply Invariant
 * @notice The sum of all balances must equal the total supply
 * @dev This is the fundamental ERC20 conservation law
 */
invariant totalSupplyIsSumOfBalances()
    to_mathint(totalSupply()) == sumOfBalances
    {
        preserved with (env e) {
            require sumOfBalances >= 0;
        }
    }

/**
 * @title Maximum Supply Invariant
 * @notice Total supply cannot exceed initial supply (1.2 billion * 10^18)
 * @dev No mint function exists, supply can only decrease via burns
 */
invariant maxTotalSupply()
    totalSupply() <= 1200000000000000000000000000
    {
        preserved {
            // Supply is set in constructor and can only decrease via burns
        }
    }

/**
 * @title Non-Negative Balances
 * @notice All balances must be non-negative (implicit in uint256)
 */
invariant nonNegativeBalances(address account)
    balanceOf(account) >= 0

/**
 * @title Balance Upper Bound
 * @notice No single account can hold more than total supply
 */
invariant balanceUpperBound(address account)
    balanceOf(account) <= totalSupply()

// ============================================================
// RULES - TRANSFER PROPERTIES
// ============================================================

/**
 * @title Transfer Integrity
 * @notice Transfer correctly moves tokens between accounts
 */
rule transferIntegrity(address to, uint256 amount) {
    env e;
    
    uint256 senderBalanceBefore = balanceOf(e.msg.sender);
    uint256 recipientBalanceBefore = balanceOf(to);
    
    require e.msg.sender != to; // Non-self transfer
    require senderBalanceBefore >= amount; // Sufficient balance
    
    transfer(e, to, amount);
    
    uint256 senderBalanceAfter = balanceOf(e.msg.sender);
    uint256 recipientBalanceAfter = balanceOf(to);
    
    assert senderBalanceAfter == senderBalanceBefore - amount,
        "Sender balance must decrease by transfer amount";
    assert recipientBalanceAfter == recipientBalanceBefore + amount,
        "Recipient balance must increase by transfer amount";
}

/**
 * @title Self-Transfer No-Op
 * @notice Self-transfers do not change balance
 */
rule selfTransferNoOp(uint256 amount) {
    env e;
    
    uint256 balanceBefore = balanceOf(e.msg.sender);
    require balanceBefore >= amount;
    
    transfer(e, e.msg.sender, amount);
    
    uint256 balanceAfter = balanceOf(e.msg.sender);
    
    assert balanceAfter == balanceBefore,
        "Self-transfer must not change balance";
}

/**
 * @title Transfer Preserves Total Supply
 * @notice Transfer does not create or destroy tokens
 */
rule transferPreservesTotalSupply(address to, uint256 amount) {
    env e;
    
    uint256 totalBefore = totalSupply();
    
    transfer(e, to, amount);
    
    uint256 totalAfter = totalSupply();
    
    assert totalAfter == totalBefore,
        "Transfer must not change total supply";
}

/**
 * @title Transfer Reverts on Insufficient Balance
 * @notice Transfer fails if sender has insufficient balance
 */
rule transferRevertsOnInsufficientBalance(address to, uint256 amount) {
    env e;
    
    uint256 senderBalance = balanceOf(e.msg.sender);
    
    require senderBalance < amount;
    
    transfer@withrevert(e, to, amount);
    
    assert lastReverted,
        "Transfer must revert when balance is insufficient";
}

/**
 * @title Transfer Reverts to Zero Address
 * @notice Transfer to zero address must revert
 */
rule transferRevertsToZeroAddress(uint256 amount) {
    env e;
    
    transfer@withrevert(e, 0, amount);
    
    assert lastReverted,
        "Transfer to zero address must revert";
}

// ============================================================
// RULES - APPROVAL PROPERTIES
// ============================================================

/**
 * @title Approve Sets Allowance
 * @notice Approve correctly sets the allowance
 */
rule approveIntegrity(address spender, uint256 amount) {
    env e;
    
    approve(e, spender, amount);
    
    uint256 allowanceAfter = allowance(e.msg.sender, spender);
    
    assert allowanceAfter == amount,
        "Approve must set exact allowance";
}

/**
 * @title Approve Overwrites Previous
 * @notice New approval overwrites previous allowance
 */
rule approveOverwrites(address spender, uint256 amount1, uint256 amount2) {
    env e;
    
    approve(e, spender, amount1);
    approve(e, spender, amount2);
    
    uint256 finalAllowance = allowance(e.msg.sender, spender);
    
    assert finalAllowance == amount2,
        "Second approve must overwrite first";
}

/**
 * @title Approve Reverts to Zero Address
 * @notice Approval to zero address must revert
 */
rule approveRevertsToZeroAddress(uint256 amount) {
    env e;
    
    approve@withrevert(e, 0, amount);
    
    assert lastReverted,
        "Approve to zero address must revert";
}

// ============================================================
// RULES - TRANSFERFROM PROPERTIES
// ============================================================

/**
 * @title TransferFrom Integrity
 * @notice TransferFrom correctly moves tokens and updates allowance
 */
rule transferFromIntegrity(address from, address to, uint256 amount) {
    env e;
    
    uint256 fromBalanceBefore = balanceOf(from);
    uint256 toBalanceBefore = balanceOf(to);
    uint256 allowanceBefore = allowance(from, e.msg.sender);
    
    require from != to;
    require fromBalanceBefore >= amount;
    require allowanceBefore >= amount;
    require allowanceBefore < max_uint256; // Not infinite approval
    
    transferFrom(e, from, to, amount);
    
    uint256 fromBalanceAfter = balanceOf(from);
    uint256 toBalanceAfter = balanceOf(to);
    uint256 allowanceAfter = allowance(from, e.msg.sender);
    
    assert fromBalanceAfter == fromBalanceBefore - amount,
        "From balance must decrease";
    assert toBalanceAfter == toBalanceBefore + amount,
        "To balance must increase";
    assert allowanceAfter == allowanceBefore - amount,
        "Allowance must decrease";
}

/**
 * @title Infinite Approval Not Decreased
 * @notice Max uint256 approval is not decreased by transferFrom
 */
rule infiniteApprovalNotDecreased(address from, address to, uint256 amount) {
    env e;
    
    uint256 allowanceBefore = allowance(from, e.msg.sender);
    require allowanceBefore == max_uint256;
    require balanceOf(from) >= amount;
    
    transferFrom(e, from, to, amount);
    
    uint256 allowanceAfter = allowance(from, e.msg.sender);
    
    assert allowanceAfter == max_uint256,
        "Infinite approval must not decrease";
}

/**
 * @title TransferFrom Reverts on Insufficient Allowance
 * @notice TransferFrom fails without sufficient allowance
 */
rule transferFromRevertsOnInsufficientAllowance(address from, address to, uint256 amount) {
    env e;
    
    uint256 currentAllowance = allowance(from, e.msg.sender);
    require currentAllowance < amount;
    require balanceOf(from) >= amount; // Has balance but no allowance
    
    transferFrom@withrevert(e, from, to, amount);
    
    assert lastReverted,
        "TransferFrom must revert on insufficient allowance";
}

// ============================================================
// RULES - PERMIT PROPERTIES
// ============================================================

/**
 * @title Permit Increments Nonce
 * @notice Valid permit call increments the owner's nonce
 */
rule permitIncrementsNonce(
    address owner,
    address spender,
    uint256 value,
    uint256 deadline,
    uint8 v,
    bytes32 r,
    bytes32 s
) {
    env e;
    
    uint256 nonceBefore = nonces(owner);
    
    permit@withrevert(e, owner, spender, value, deadline, v, r, s);
    
    // If permit succeeded, nonce must have incremented
    assert !lastReverted => nonces(owner) == nonceBefore + 1,
        "Successful permit must increment nonce";
}

// ============================================================
// RULES - NO PRIVILEGE ESCALATION
// ============================================================

/**
 * @title No Unauthorized Minting
 * @notice No function can increase total supply
 */
rule noMinting(method f) {
    env e;
    calldataarg args;
    
    uint256 totalBefore = totalSupply();
    
    f(e, args);
    
    uint256 totalAfter = totalSupply();
    
    assert totalAfter <= totalBefore,
        "No function should increase total supply";
}

/**
 * @title Authorized Burning Only
 * @notice Only burn and burnFrom can decrease total supply
 */
rule authorizedBurningOnly(method f)
    filtered { f -> f.selector != sig:burn(uint256).selector 
                 && f.selector != sig:burnFrom(address,uint256).selector }
{
    env e;
    calldataarg args;
    
    uint256 totalBefore = totalSupply();
    
    f(e, args);
    
    uint256 totalAfter = totalSupply();
    
    assert totalAfter == totalBefore,
        "Only burn/burnFrom should decrease total supply";
}

/**
 * @title Burn Integrity
 * @notice Burn correctly reduces caller's balance and total supply
 */
rule burnIntegrity(uint256 amount) {
    env e;
    
    uint256 balanceBefore = balanceOf(e.msg.sender);
    uint256 totalBefore = totalSupply();
    
    require balanceBefore >= amount;
    
    burn(e, amount);
    
    uint256 balanceAfter = balanceOf(e.msg.sender);
    uint256 totalAfter = totalSupply();
    
    assert balanceAfter == balanceBefore - amount,
        "Burn must decrease caller balance by amount";
    assert totalAfter == totalBefore - amount,
        "Burn must decrease total supply by amount";
}

/**
 * @title BurnFrom Integrity
 * @notice BurnFrom correctly reduces account balance, allowance, and total supply
 */
rule burnFromIntegrity(address account, uint256 amount) {
    env e;
    
    uint256 balanceBefore = balanceOf(account);
    uint256 totalBefore = totalSupply();
    uint256 allowanceBefore = allowance(account, e.msg.sender);
    
    require balanceBefore >= amount;
    require allowanceBefore >= amount;
    require allowanceBefore < max_uint256; // Not infinite approval
    
    burnFrom(e, account, amount);
    
    uint256 balanceAfter = balanceOf(account);
    uint256 totalAfter = totalSupply();
    uint256 allowanceAfter = allowance(account, e.msg.sender);
    
    assert balanceAfter == balanceBefore - amount,
        "BurnFrom must decrease account balance by amount";
    assert totalAfter == totalBefore - amount,
        "BurnFrom must decrease total supply by amount";
    assert allowanceAfter == allowanceBefore - amount,
        "BurnFrom must decrease allowance by amount";
}

/**
 * @title Balance Only Changes via Transfer
 * @notice Only transfer/transferFrom can change balances
 */
rule balanceOnlyChangesViaTransfer(method f, address account) 
    filtered { f -> f.selector != sig:transfer(address,uint256).selector 
                 && f.selector != sig:transferFrom(address,address,uint256).selector
                 && f.selector != sig:burn(uint256).selector
                 && f.selector != sig:burnFrom(address,uint256).selector } 
{
    env e;
    calldataarg args;
    
    uint256 balanceBefore = balanceOf(account);
    
    f(e, args);
    
    uint256 balanceAfter = balanceOf(account);
    
    assert balanceAfter == balanceBefore,
        "Only transfer/burn functions should change balances";
}

/**
 * @title Allowance Only Changes via Approve/Permit
 * @notice Only approve/permit/transferFrom can change allowances
 */
rule allowanceOnlyChangesViaApprove(method f, address owner, address spender)
    filtered { f -> f.selector != sig:approve(address,uint256).selector
                 && f.selector != sig:permit(address,address,uint256,uint256,uint8,bytes32,bytes32).selector
                 && f.selector != sig:transferFrom(address,address,uint256).selector
                 && f.selector != sig:burnFrom(address,uint256).selector }
{
    env e;
    calldataarg args;
    
    uint256 allowanceBefore = allowance(owner, spender);
    
    f(e, args);
    
    uint256 allowanceAfter = allowance(owner, spender);
    
    assert allowanceAfter == allowanceBefore,
        "Only approve/permit/transferFrom/burnFrom should change allowances";
}

// ============================================================
// RULES - THIRD PARTY PROTECTION
// ============================================================

/**
 * @title Third Party Balance Protection
 * @notice User's balance cannot be decreased without their action or approval
 */
rule thirdPartyBalanceProtection(address user, method f) {
    env e;
    calldataarg args;
    
    require e.msg.sender != user; // Third party calling
    
    uint256 balanceBefore = balanceOf(user);
    uint256 allowanceToSender = allowance(user, e.msg.sender);
    
    f(e, args);
    
    uint256 balanceAfter = balanceOf(user);
    
    // Balance can only decrease if:
    // 1. It's a transferFrom or burnFrom with sufficient allowance
    // 2. User is receiving tokens (balance increases)
    assert balanceAfter < balanceBefore => 
        ((f.selector == sig:transferFrom(address,address,uint256).selector || 
          f.selector == sig:burnFrom(address,uint256).selector) && allowanceToSender > 0),
        "Third party cannot decrease balance without allowance";
}

/**
 * @title Third Party Allowance Protection  
 * @notice User's allowances cannot be changed by third parties
 */
rule thirdPartyAllowanceProtection(address owner, address spender, method f)
    filtered { f -> f.selector != sig:transferFrom(address,address,uint256).selector }
{
    env e;
    calldataarg args;
    
    require e.msg.sender != owner; // Third party calling
    
    uint256 allowanceBefore = allowance(owner, spender);
    
    f(e, args);
    
    uint256 allowanceAfter = allowance(owner, spender);
    
    // Allowance should not change (except via permit with valid signature)
    assert allowanceAfter == allowanceBefore || 
           f.selector == sig:permit(address,address,uint256,uint256,uint8,bytes32,bytes32).selector,
        "Third party cannot change allowance without valid permit";
}
