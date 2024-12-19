// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

contract MaliciousTreasury {
    // Always revert when receiving payments
    receive() external payable {
        revert("Payment rejected");
    }
}
