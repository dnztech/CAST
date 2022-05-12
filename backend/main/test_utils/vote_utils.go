package test_utils

import (
	"bytes"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"net/http"
	"net/http/httptest"
	"strconv"
	"time"

	"github.com/brudfyi/flow-voting-tool/main/models"
)

func (otu *OverflowTestUtils) GetVotesForProposalAPI(proposalId int) *httptest.ResponseRecorder {
	req, _ := http.NewRequest("GET", "/proposals/"+strconv.Itoa(proposalId)+"/votes", nil)
	return otu.ExecuteRequest(req)
}

func (otu *OverflowTestUtils) GetVoteForProposalByAddressAPI(proposalId int, accountName string) *httptest.ResponseRecorder {
	account, _ := otu.O.State.Accounts().ByName(fmt.Sprintf("emulator-%s", accountName))
	addr := fmt.Sprintf("0x%s", account.Address().String())
	url := fmt.Sprintf("/proposals/%s/votes/%s", strconv.Itoa(proposalId), addr)
	req, _ := http.NewRequest("GET", url, nil)
	return otu.ExecuteRequest(req)
}

func (otu *OverflowTestUtils) CreateVoteAPI(proposalId int, payload *models.Vote) *httptest.ResponseRecorder {
	json, _ := json.Marshal(payload)
	req, _ := http.NewRequest("POST", "/proposals/"+strconv.Itoa(proposalId)+"/votes", bytes.NewBuffer(json))
	req.Header.Set("Content-Type", "application/json")
	return otu.ExecuteRequest(req)
}

func (otu *OverflowTestUtils) GenerateValidVotePayload(accountName string, proposalId int, choice string) *models.Vote {
	timestamp := time.Now().UnixNano() / int64(time.Millisecond)
	hexChoice := hex.EncodeToString([]byte(choice))
	message := strconv.Itoa(proposalId) + ":" + hexChoice + ":" + fmt.Sprint(timestamp)
	compositeSignatures := otu.GenerateCompositeSignatures(accountName, message)
	account, _ := otu.O.State.Accounts().ByName(fmt.Sprintf("emulator-%s", accountName))
	address := fmt.Sprintf("0x%s", account.Address().String())

	vote := models.Vote{Proposal_id: proposalId, Addr: address, Choice: choice,
		Composite_signatures: compositeSignatures, Message: message}

	return &vote
}