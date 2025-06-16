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
	// Always ensure we return a response, even if something goes wrong
	defer func() {
		if r := recover(); r != nil {
			Context.Log("Panic occurred: " + r.(string))
		}
	}()

	Context.Log("Function started")

	// Validate environment variables first
	if os.Getenv("BINGO_DATABASE_ID") == "" || os.Getenv("GAMES_COLLECTION_ID") == "" {
		Context.Log("Missing environment variables")
		return Context.Res.Json(map[string]interface{}{
			"success": false,
			"error":   "Missing required environment variables",
		})
	}

	client := appwrite.NewClient(
		appwrite.WithEndpoint(os.Getenv("APPWRITE_FUNCTION_API_ENDPOINT")),
		appwrite.WithProject(os.Getenv("APPWRITE_FUNCTION_PROJECT_ID")),
		appwrite.WithKey(Context.Req.Headers["x-appwrite-key"]),
	)
	databases := appwrite.NewDatabases(client)

	// Retrieve the request body by calling the function.
	bodyVal := Context.Req.Body()
	if bodyVal == nil {
		Context.Log("Request body is nil")
		return Context.Res.Json(map[string]interface{}{
			"success": false,
			"error":   "Request body is empty",
		})
	}

	body, ok := bodyVal.(string)
	if !ok {
		Context.Log("Request body is not a string")
		return Context.Res.Json(map[string]interface{}{
			"success": false,
			"error":   "Invalid request body type",
		})
	}

	Context.Log("Request body: " + body)

	var payload map[string]interface{}
	if err := json.Unmarshal([]byte(body), &payload); err != nil {
		Context.Log("JSON unmarshal error: " + err.Error())
		return Context.Res.Json(map[string]interface{}{
			"success": false,
			"error":   "Invalid JSON payload: " + err.Error(),
		})
	}

	Context.Log("Payload parsed successfully")

	// Validate required fields with better error handling
	creatorId, ok := payload["creatorId"].(string)
	if !ok || creatorId == "" {
		return Context.Res.Json(map[string]interface{}{
			"success": false,
			"error":   "Missing or invalid creatorId",
		})
	}

	// Handle boardSize conversion more safely
	var boardSize int
	switch v := payload["boardSize"].(type) {
	case float64:
		boardSize = int(v)
	case string:
		var err error
		boardSize, err = strconv.Atoi(v)
		if err != nil {
			return Context.Res.Json(map[string]interface{}{
				"success": false,
				"error":   "Invalid boardSize format",
			})
		}
	default:
		return Context.Res.Json(map[string]interface{}{
			"success": false,
			"error":   "Missing or invalid boardSize",
		})
	}

	// Handle votingThreshold conversion more safely
	var votingThreshold int
	switch v := payload["votingThreshold"].(type) {
	case float64:
		votingThreshold = int(v)
	case string:
		var err error
		votingThreshold, err = strconv.Atoi(v)
		if err != nil {
			return Context.Res.Json(map[string]interface{}{
				"success": false,
				"error":   "Invalid votingThreshold format",
			})
		}
	default:
		return Context.Res.Json(map[string]interface{}{
			"success": false,
			"error":   "Missing or invalid votingThreshold",
		})
	}

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
				"error":   "Invalid event format at index " + strconv.Itoa(i),
			})
		}
	}

	// Handle boolean values with defaults
	randomizeBoards, _ := payload["randomizeBoards"].(bool)
	addFreeSpace, _ := payload["addFreeSpace"].(bool)

	totalBoardSpots := boardSize * boardSize
	requiredEvents := totalBoardSpots
	if addFreeSpace {
		requiredEvents--
	}

	if !randomizeBoards && len(events) < requiredEvents {
		return Context.Res.Json(map[string]interface{}{
			"success": false,
			"error":   "Not enough events provided. Need " + strconv.Itoa(requiredEvents) + ", got " + strconv.Itoa(len(events)),
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

	Context.Log("Attempting to create document")

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
			"error":   "Failed to create game document: " + err.Error(),
		})
	}

	Context.Log("Document created successfully")

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
