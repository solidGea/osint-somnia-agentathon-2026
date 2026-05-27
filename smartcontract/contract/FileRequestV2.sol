// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "./interfaces/ISomniaAgents.sol";

/// @title FileRequestV2
/// @notice Records OSINT file requests and stores response hashes on-chain
/// @dev The actual response data is kept off-chain, with only a hash and status on-chain.
///      This enables the server to validate the response without exposing large JSON on-chain.
///
/// AGENT: JSON API Request (ID: 13174292974160097713)
/// METHOD: fetchString(url, selector) → string
contract FileRequestV2 {
    IAgentRequester public constant PLATFORM =
        IAgentRequester(0x037Bb9C718F3f7fe5eCBDB0b600D607b52706776);

    uint256 public constant JSON_API_AGENT_ID = 13174292974160097713;
    uint256 public constant REQUEST_DEPOSIT = 12e16;

    address public owner;
    address public feeRecipient;
    uint256 public additionalFee;
    string public baseUrl;
    string public defaultSelector;

    enum RequestStatus { None, Pending, Success, Failed }

    struct RequestInfo {
        address requester;
        RequestStatus status;
        bytes32 responseHash;
    }

    mapping(uint256 => RequestInfo) public requests;

    event RequestCreated(uint256 indexed requestId, address indexed requester, string queryType, string target);
    event RequestCompleted(uint256 indexed requestId, bytes32 responseHash, RequestStatus status);
    event BaseUrlUpdated(string oldUrl, string newUrl);
    event SelectorUpdated(string oldSelector, string newSelector);
    event FeeRecipientUpdated(address oldRecipient, address newRecipient);
    event AdditionalFeeUpdated(uint256 oldFee, uint256 newFee);

    modifier onlyOwner() {
        require(msg.sender == owner, "Only owner");
        _;
    }

    constructor(
        string memory _baseUrl,
        string memory _defaultSelector,
        address _feeRecipient
    ) {
        require(_feeRecipient != address(0), "Invalid fee recipient");
        owner = msg.sender;
        feeRecipient = _feeRecipient;
        additionalFee = 0.5 ether;
        baseUrl = _baseUrl;
        defaultSelector = _defaultSelector;
    }

    function requestStringLookup(string calldata target)
        external
        payable
        returns (uint256 requestId)
    {
        requestId = _requestStringData("string-lookup", target, defaultSelector);
        requests[requestId].requester = msg.sender;
        requests[requestId].status = RequestStatus.Pending;
        emit RequestCreated(requestId, msg.sender, "string-lookup", target);
    }

    function requestData(string calldata queryType, string calldata target)
        external
        payable
        returns (uint256 requestId)
    {
        requestId = _requestStringData(queryType, target, defaultSelector);
        requests[requestId].requester = msg.sender;
        requests[requestId].status = RequestStatus.Pending;
        emit RequestCreated(requestId, msg.sender, queryType, target);
    }

    function requestDataWithSelector(
        string calldata queryType,
        string calldata target,
        string calldata selector
    ) external payable returns (uint256 requestId) {
        requestId = _requestStringData(queryType, target, selector);
        requests[requestId].requester = msg.sender;
        requests[requestId].status = RequestStatus.Pending;
        emit RequestCreated(requestId, msg.sender, queryType, target);
    }

    function _requestStringData(
        string memory queryType,
        string memory target,
        string memory selector
    ) internal returns (uint256 requestId) {
        string memory url = string.concat(baseUrl, "?type=", queryType, "&target=", target);

        bytes memory payload = abi.encodeWithSelector(
            IJsonApiAgent.fetchString.selector,
            url,
            selector
        );

        uint256 deposit = REQUEST_DEPOSIT;
        uint256 totalRequired = deposit + additionalFee;
        require(msg.value >= totalRequired, "Insufficient deposit");

        (bool feeSuccess, ) = payable(feeRecipient).call{value: additionalFee}("");
        require(feeSuccess, "Fee transfer failed");

        requestId = PLATFORM.createRequest{value: deposit}(
            JSON_API_AGENT_ID,
            address(this),
            this.handleResponse.selector,
            payload
        );

        if (msg.value > totalRequired) {
            payable(msg.sender).transfer(msg.value - totalRequired);
        }
    }

    function handleResponse(
        uint256 requestId,
        Response[] memory responses,
        ResponseStatus status,
        Request memory /* details */
    ) external {
        require(msg.sender == address(PLATFORM), "Only platform");
        require(requests[requestId].requester != address(0), "Unknown request");

        if (status == ResponseStatus.Success && responses.length > 0) {
            requests[requestId].status = RequestStatus.Success;
            requests[requestId].responseHash = keccak256(responses[0].result);
            emit RequestCompleted(requestId, requests[requestId].responseHash, RequestStatus.Success);
        } else {
            requests[requestId].status = RequestStatus.Failed;
            emit RequestCompleted(requestId, requests[requestId].responseHash, RequestStatus.Failed);
        }
    }

    function setBaseUrl(string calldata newBaseUrl) external onlyOwner {
        string memory oldUrl = baseUrl;
        baseUrl = newBaseUrl;
        emit BaseUrlUpdated(oldUrl, newBaseUrl);
    }

    function setDefaultSelector(string calldata newSelector) external onlyOwner {
        string memory oldSelector = defaultSelector;
        defaultSelector = newSelector;
        emit SelectorUpdated(oldSelector, newSelector);
    }

    function setFeeRecipient(address newRecipient) external onlyOwner {
        require(newRecipient != address(0), "Invalid address");
        address old = feeRecipient;
        feeRecipient = newRecipient;
        emit FeeRecipientUpdated(old, newRecipient);
    }

    function setAdditionalFee(uint256 newFee) external onlyOwner {
        uint256 old = additionalFee;
        additionalFee = newFee;
        emit AdditionalFeeUpdated(old, newFee);
    }

    function transferOwnership(address newOwner) external onlyOwner {
        require(newOwner != address(0), "Invalid address");
        owner = newOwner;
    }

    function getRequiredDeposit() external view returns (uint256) {
        return REQUEST_DEPOSIT + additionalFee;
    }

    function getAgentDeposit() external pure returns (uint256) {
        return REQUEST_DEPOSIT;
    }

    receive() external payable {}
}
