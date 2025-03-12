package handler

import (
	"encoding/json"
	"math/rand"
	"os"
	"strconv"
	"strings"

	"github.com/appwrite/sdk-for-go/appwrite"
	"github.com/appwrite/sdk-for-go/id"
	"github.com/open-runtimes/types-for-go/v4/openruntimes"
)

type Game struct {
	CreatorId       string   `json:"creatorId"`
	BoardSize       int      `json:"boardSize"`
	Events          []string `json:"events"`
	Status          string   `json:"status"`
	GameCode        string   `json:"gameCode"`
	VotingThreshold int      `json:"votingThreshold"`
	Players         []string `json:"players"`
	Votes           []int    `json:"votes"`
	VerifiedEvents  []string `json:"verifiedEvents"`
	Host            string   `json:"host"`
	RandomizeBoards bool     `json:"randomizeBoards"`
	AddFreeSpace    bool     `json:"addFreeSpace"`
	FreeSpaceText   string   `json:"freeSpaceText,omitempty"`
}

func Main(Context openruntimes.Context) openruntimes.Response {
	client := appwrite.NewClient(
		appwrite.WithEndpoint(os.Getenv("APPWRITE_FUNCTION_API_ENDPOINT")),
		appwrite.WithProject(os.Getenv("APPWRITE_FUNCTION_PROJECT_ID")),
		appwrite.WithKey(Context.Req.Headers["x-appwrite-key"]),
	)
	databases := appwrite.NewDatabases(client)

	// Retrieve the request body by calling the function.
	bodyVal := Context.Req.Body()
	body, ok := bodyVal.(string)
	if !ok {
		return Context.Res.Json(map[string]interface{}{
			"success": false,
			"error":   "Invalid request body",
		})
	}

	var payload map[string]interface{}
	if err := json.Unmarshal([]byte(body), &payload); err != nil {
		return Context.Res.Json(map[string]interface{}{
			"success": false,
			"error":   "Invalid JSON payload",
		})
	}

	creatorId, _ := payload["creatorId"].(string)
	boardSize, _ := strconv.Atoi(payload["boardSize"].(string))
	votingThreshold, _ := strconv.Atoi(payload["votingThreshold"].(string))
	eventsInterface, ok := payload["events"].([]interface{})
	if !ok {
		return Context.Res.Json(map[string]interface{}{
			"success": false,
			"error":   "Events must be an array",
		})
	}
	events := make([]string, len(eventsInterface))
	for i, e := range eventsInterface {
		if eventStr, ok := e.(string); ok {
			events[i] = eventStr
		} else {
			return Context.Res.Json(map[string]interface{}{
				"success": false,
				"error":   "Invalid event format",
			})
		}
	}

	randomizeBoards := payload["randomizeBoards"].(bool)
	addFreeSpace := payload["addFreeSpace"].(bool)
	totalBoardSpots := boardSize * boardSize
	requiredEvents := totalBoardSpots
	if addFreeSpace {
		requiredEvents--
	}

	if !randomizeBoards && len(events) < requiredEvents {
		return Context.Res.Json(map[string]interface{}{
			"success": false,
			"error":   "Not enough events provided",
		})
	}

	gameCode, ok := payload["gameCode"].(string)
	if !ok || len(gameCode) == 0 {
		gameCode = strings.ToUpper(RandomString(4))
	}

	game := Game{
		CreatorId:       creatorId,
		BoardSize:       boardSize,
		Events:          events,
		Status:          "waiting",
		GameCode:        gameCode,
		VotingThreshold: votingThreshold,
		Players:         []string{},
		Votes:           make([]int, len(events)),
		VerifiedEvents:  []string{},
		Host:            creatorId,
		RandomizeBoards: randomizeBoards,
		AddFreeSpace:    addFreeSpace,
	}

	if addFreeSpace {
		if freeSpaceText, ok := payload["freeSpaceText"].(string); ok {
			game.FreeSpaceText = freeSpaceText
		} else {
			game.FreeSpaceText = "Free Space"
		}
	}

	document, err := databases.CreateDocument(
		os.Getenv("BINGO_DATABASE_ID"),
		os.Getenv("GAMES_COLLECTION_ID"),
		id.Unique(),
		game,
	)
	if err != nil {
		Context.Log("Error creating game document: " + err.Error())
		return Context.Res.Json(map[string]interface{}{
			"success": false,
			"error":   "Failed to create game document",
		})
	}

	return Context.Res.Json(map[string]interface{}{
		"success": true,
		"game":    document,
	})
}

func RandomString(n int) string {
	letters := "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789"
	result := make([]byte, n)
	for i := range result {
		result[i] = letters[rand.Intn(len(letters))]
	}
	return string(result)
}
