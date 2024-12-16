//SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

contract Treasury is AccessControl, ReentrancyGuard {
    // Define roles
    bytes32 public constant CEO_ROLE = keccak256("CEO_ROLE");
    bytes32 public constant TREASURER_ROLE = keccak256("TREASURER_ROLE");

    // Maximum withdrawal amount
    uint256 public maxWithdrawalAmount = 10 ether;

    // Weekly withdrawal limit
    uint256 public weeklyLimit = 50 ether;

    // Track withdrawals per week
    mapping(uint256 => uint256) private weeklyWithdrawals;

    // Pending approvals for multi-sig withdrawals
    struct Approval {
        address to;
        uint256 amount;
        string reason;
        bool treasurerApproved;
        bool ceoApproved;
    }

    Approval public pendingApproval;

    // Events for transparency
    event FundsWithdrawn(address indexed to, uint256 amount, string reason);
    event FundsReceived(address indexed from, uint256 amount);
    event WithdrawalProposed(address indexed to, uint256 amount, string reason);
    event ApprovalGranted(address indexed approver, string role);
    event TreasurerRoleGranted(address indexed newTreasurer);
    event AdminRoleTransferred(
        address indexed previousAdmin,
        address indexed newAdmin
    );
    event WeeklyLimitUpdated(uint256 newLimit);

    constructor(address initialAdmin, address initialTreasurer) {
        _grantRole(DEFAULT_ADMIN_ROLE, initialAdmin);
        _grantRole(CEO_ROLE, initialAdmin);
        _grantRole(TREASURER_ROLE, initialTreasurer);

        emit TreasurerRoleGranted(initialTreasurer);
    }

    // Receive funds
    receive() external payable {
        emit FundsReceived(msg.sender, msg.value);
    }

    // Get current week timestamp (UTC midnight of Monday)
    function _currentWeek() internal view returns (uint256) {
        return block.timestamp / 1 weeks;
    }

    // Propose a withdrawal (multi-role approval mechanism)
    function proposeWithdrawal(
        address payable _to,
        uint256 _amount,
        string memory _reason
    ) external {
        require(
            hasRole(CEO_ROLE, msg.sender) ||
                hasRole(TREASURER_ROLE, msg.sender),
            "Unauthorized: requires CEO or Treasurer role"
        );
        require(_amount <= address(this).balance, "Insufficient funds");
        require(
            _amount <= maxWithdrawalAmount,
            "Exceeds maximum withdrawal amount"
        );

        uint256 currentWeek = _currentWeek();
        require(
            weeklyWithdrawals[currentWeek] + _amount <= weeklyLimit,
            "Exceeds weekly withdrawal limit"
        );

        pendingApproval = Approval({
            to: _to,
            amount: _amount,
            reason: _reason,
            treasurerApproved: false,
            ceoApproved: false
        });

        emit WithdrawalProposed(_to, _amount, _reason);
    }

    // Approve a proposed withdrawal
    function approveWithdrawal() external {
        require(
            hasRole(CEO_ROLE, msg.sender) ||
                hasRole(TREASURER_ROLE, msg.sender),
            "Unauthorized: requires CEO or Treasurer role"
        );
        require(pendingApproval.to != address(0), "No pending approval");

        if (hasRole(CEO_ROLE, msg.sender)) {
            require(!pendingApproval.ceoApproved, "Already approved by CEO");
            pendingApproval.ceoApproved = true;
        } else if (hasRole(TREASURER_ROLE, msg.sender)) {
            require(
                !pendingApproval.treasurerApproved,
                "Already approved by Treasurer"
            );
            pendingApproval.treasurerApproved = true;
        }

        emit ApprovalGranted(
            msg.sender,
            hasRole(CEO_ROLE, msg.sender) ? "CEO_ROLE" : "TREASURER_ROLE"
        );

        if (pendingApproval.ceoApproved && pendingApproval.treasurerApproved) {
            executeWithdrawal();
        }
    }

    // Execute an approved withdrawal
    function executeWithdrawal() internal nonReentrant {
        require(pendingApproval.to != address(0), "No pending approval");
        require(
            pendingApproval.ceoApproved && pendingApproval.treasurerApproved,
            "Approval not complete"
        );

        address payable to = payable(pendingApproval.to);
        uint256 amount = pendingApproval.amount;
        string memory reason = pendingApproval.reason;

        uint256 currentWeek = _currentWeek();
        weeklyWithdrawals[currentWeek] += amount;

        pendingApproval = Approval({
            to: address(0),
            amount: 0,
            reason: "",
            treasurerApproved: false,
            ceoApproved: false
        });

        (bool success, ) = to.call{value: amount}("");
        require(success, "Transfer failed");

        emit FundsWithdrawn(to, amount, reason);
    }

    // Transfer the Default Admin Role
    function transferAdminRole(address newAdmin) external {
        require(
            hasRole(DEFAULT_ADMIN_ROLE, msg.sender),
            "Only admin can transfer admin role"
        );
        require(newAdmin != address(0), "New admin cannot be the zero address");

        address previousAdmin = msg.sender;
        _revokeRole(DEFAULT_ADMIN_ROLE, previousAdmin);
        _grantRole(DEFAULT_ADMIN_ROLE, newAdmin);

        emit AdminRoleTransferred(previousAdmin, newAdmin);
    }

    // Assign a new treasurer
    function assignTreasurer(address newTreasurer) external {
        require(
            hasRole(DEFAULT_ADMIN_ROLE, msg.sender),
            "Only admin can assign treasurer"
        );
        require(
            newTreasurer != address(0),
            "New treasurer cannot be the zero address"
        );

        _revokeRole(TREASURER_ROLE, getRoleMember(TREASURER_ROLE, 0));
        _grantRole(TREASURER_ROLE, newTreasurer);

        emit TreasurerRoleGranted(newTreasurer);
    }

    // Update maximum withdrawal amount
    function updateMaxWithdrawalAmount(uint256 _newLimit) external {
        require(
            hasRole(DEFAULT_ADMIN_ROLE, msg.sender),
            "Only admin can update limit"
        );
        maxWithdrawalAmount = _newLimit;
    }

    // Update weekly withdrawal limit
    function updateWeeklyLimit(uint256 _newLimit) external {
        require(
            hasRole(DEFAULT_ADMIN_ROLE, msg.sender),
            "Only admin can update weekly limit"
        );
        weeklyLimit = _newLimit;
        emit WeeklyLimitUpdated(_newLimit);
    }
}
