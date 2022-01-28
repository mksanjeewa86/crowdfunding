//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.0;

import "./Project.sol";

contract ProjectFactory {

  Project[] private projectFactory;

  event ProjectStarted(
    address contractAddress,
    address projectStarter,
    string projectTitle,
    string projectDesc,
    uint256 goalAmount
  );

  function startProject(string calldata title, string calldata description, uint256 amountToRaise) external {
    Project project = new Project(payable(msg.sender), title, description, amountToRaise);
    emit ProjectStarted(address(project), msg.sender, title, description, amountToRaise);
    projectFactory.push(project);
  }

  function listProjects() external view returns (Project[] memory){
    return projectFactory;
  }

}