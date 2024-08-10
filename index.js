var canvas;
var resultText;
var context;

var pieceImages = [null, null, null, null, null, null, 
			 null, null, null, null, null, null];

var board = [];
var boardMoves = [];
var oldBoardMoves = [];
var epTarget = [];
var numKingMoves = 
{
	true: 0,
	false: 0
};
var playerTurn = true;

function piece(type, team)
{
	this.type = type;
	this.team = team;
}

// GAME STATE
	const GAME_INPROGRESS = 0;
	const GAME_WIN = 1;
	const GAME_STALEMATE = 2;
	const GAME_THREEFOLD = 3;
	const GAME_LOSE = 4;
// GAME STATE END

var gameState = GAME_INPROGRESS;

// MOVE TYPES
	const MOVE_NORMAL = 1;
	const MOVE_CAPTURE = 2;
	const MOVE_DOUBLE_MOVE = 4; // for pawn
	const MOVE_ENPASSANT = 8;
	const MOVE_PROMOTE = 16;
	const MOVE_CASTLE = 32;
// MOVE TYPES end

// DIRECTIONS
	const DIR_N = 0;
	const DIR_E = 1;
	const DIR_S = 2;
	const DIR_W = 3;
	const DIR_NE = 4;
	const DIR_SE = 5;
	const DIR_SW = 6;
	const DIR_NW = 7;
// DIRECTIONS end



function getDirectionOffset(dir)
{
	switch (dir)
	{
		case DIR_N: return -8;
		case DIR_E: return 1;
		case DIR_S: return 8;
		case DIR_W: return -1;
		case DIR_NE: return -7;
		case DIR_SE: return 9
		case DIR_SW: return 7;
		case DIR_NW: return -9;
	}
}

// 2d array, first index direction then index board i
var numSquaresToEdge = [];

function move(src, dst, type)
{
	this.src = src;
	this.dst = dst;
	this.type = type;
	this.srcPiece = board[src] ? board[src].type : null;
	this.dstPiece = board[dst] ? board[dst].type : null;
	this.equals = function(m) { return this.src == m.src && this.dst == m.dst; }
}

function kingInCheck(team)
{
	var enemyMoves = getMoves(!team);
	for (var i = 0; i < enemyMoves.length; ++i)
	{
		var m = enemyMoves[i];
		if (m.dstPiece == 'k')
			return true;
	}
	return false;
}

function getGameState(turn)
{
	if (!turn)
	{
		var enemyMoves = getLegalMoves(false);
		if (enemyMoves.length == 0)
			if (kingInCheck(false))
				return GAME_WIN;
			else
				return GAME_STALEMATE;
	}
	else
	{
		var myMoves = getLegalMoves(true);
		if (myMoves.length == 0)
			if (kingInCheck(true))
				return GAME_LOSE;
			else
				return GAME_STALEMATE;
	}
	var l = boardMoves.length;
	if (l > 5)
	{	
		if (boardMoves[l - 1].equals(boardMoves[l - 5]) && boardMoves[l-2].equals(boardMoves[l-6]))
			return GAME_THREEFOLD;
	}
	return GAME_INPROGRESS;
}

function playMove(m)
{
	if (m.type & MOVE_ENPASSANT)
		board[epTarget[epTarget.length - 1]] = null;
	
	// check if pawn double move to allow en passant next move
	if (m.type & MOVE_DOUBLE_MOVE)
		epTarget.push(m.dst);
	else
		epTarget.push(-1);
	var team = board[m.src].team;
	
	if (m.type & MOVE_PROMOTE)
		board[m.dst] = new piece('q', team);
	else
		board[m.dst] = board[m.src];

	if (m.type & MOVE_CASTLE)
	{
		var short = m.dst - m.src == 2;
		if (short)
		{
			board[m.src + 3] = null;
			board[m.dst - 1] = new piece('r', team);
		}
		else
		{
			board[m.src - 4] = null;
			board[m.dst + 1] = new piece('r', team);
		}
	}

	if (m.srcPiece == 'k')
		numKingMoves[team]++;
	board[m.src] = null;
	boardMoves.push(m);
	//playerTurn = !playerTurn;
}

function unplayLastMove()
{
	if (boardMoves.length == 0)
		return;
	var lastMove = boardMoves[boardMoves.length - 1];
	var team = board[lastMove.dst].team;
	board[lastMove.dst] = lastMove.dstPiece ? new piece(lastMove.dstPiece, !team) : null;
	board[lastMove.src] = new piece(lastMove.srcPiece, team);
	if (lastMove.type & MOVE_ENPASSANT)
	{
		var pawnOffset = !team ? -8 : 8;
		var target = lastMove.dst + pawnOffset;
		board[target] = new piece('p', !team);
	}
	if (lastMove.type & MOVE_CASTLE)
	{
		var short = lastMove.dst - lastMove.src == 2;
		if (short)
		{
			board[lastMove.dst - 1] = null;
			board[lastMove.src + 3] = new piece('r', team);
		}
		else
		{
			board[lastMove.dst + 1] = null;
			board[lastMove.src - 4] = new piece('r', team);
		}
	}
	if (lastMove.srcPiece == 'k')
		numKingMoves[team]--;
	epTarget.pop();
	boardMoves.pop();
	return lastMove;
}

// knightMoves[i] = array[offset, spaceNorth, spaceEast]
const knightMoves = [
	[-10, 1, -2], [-17, 2, -1], [-15, 2, 1], [-6, 1, 2],
	[6, -1, -2], [15, -2, -1], [17, -2, 1], [10, -1, 2]
];

const kingMoveOffsets = [
	[1, 0], [1, 1], [0, 1], [-1, 1], [-1, 0], [-1, -1], [0, -1], [1, -1]
];

const pawnCaptureOffsets = [
	
];


var selectedIndex = -1;
var selectedX;
var selectedY;

function getMoves(team)
{
	var moves = [];
	for (var i = 0; i < 64; ++i)
	{
		var p = board[i];
		if (!p || p.team != team)
			continue;
		switch (p.type)
		{
			case 'p':
			if (team) // white pawn
			{
				// get single move
				if (i > 7 && !board[i - 8])
				{
					if (i < 16)
						moves.push(new move(i, i - 8, MOVE_PROMOTE));
					else
						moves.push(new move(i, i - 8, MOVE_NORMAL));
				}
				// get double move
				if (i >= 48 && i < 56 && !board[i - 16] && !board[i - 8])
					moves.push(new move(i, i - 16, MOVE_DOUBLE_MOVE));
				// get capture moves
				var pNE = board[i - 7];
				var pNW = board[i - 9];
				var diagonalCaptureType = (i < 16 ? MOVE_CAPTURE | MOVE_PROMOTE : MOVE_CAPTURE);
				if (pNE && pNE.team != team && numSquaresToEdge[DIR_E][i] > 0)
					moves.push(new move(i, i - 7, diagonalCaptureType));
				if (pNW && pNW.team != team && numSquaresToEdge[DIR_W][i] > 0)
					moves.push(new move(i, i - 9, diagonalCaptureType));
				if (epTarget.length > 0)
				{
					// get en passant capture
					var target = epTarget[epTarget.length - 1];
					if (target != -1 && Math.abs(target - i) == 1 && board[target] && board[target].team != team)
						moves.push(new move(i, target - 8, MOVE_ENPASSANT));
				}
				//if (enPassantTarget != -1 && Math.abs(enPassantTarget - i) == 1)
					//moves.push(new move(i, enPassantTarget - 8, MOVE_ENPASSANT));
			}
			else // black pawn
			{
				if (i < 56 && !board[i + 8])
				{
					if (i > 47)
						moves.push(new move(i, i + 8, MOVE_PROMOTE));
					else
						moves.push(new move(i, i + 8, MOVE_NORMAL));
				}
				if (i >= 8 && i < 16 && !board[i + 16] && !board[i + 8])
					moves.push(new move(i, i + 16, MOVE_DOUBLE_MOVE));
				var pSW = board[i + 7];
				var pSE = board[i + 9];
				var diagonalCaptureType = (i > 47 ? MOVE_CAPTURE | MOVE_PROMOTE : MOVE_CAPTURE);
				if (pSW && pSW.team != team && numSquaresToEdge[DIR_W][i] > 0)
					moves.push(new move(i, i + 7, diagonalCaptureType));
				if (pSE && pSE.team != team && numSquaresToEdge[DIR_E][i] > 0)
					moves.push(new move(i, i + 9, diagonalCaptureType));
				if (epTarget.length > 0)
				{
					// get en passant capture
					var target = epTarget[epTarget.length - 1];
					if (target != -1 && Math.abs(target - i) == 1 && board[target] && board[target].team != team)
						moves.push(new move(i, target + 8, MOVE_ENPASSANT));
				}
				//if (enPassantTarget != -1 && Math.abs(enPassantTarget - i) == 1)
					//moves.push(new move(i, enPassantTarget + 8, MOVE_ENPASSANT));
			}
			break;
			case 'b':
			case 'r':
			case 'q':
			var startIndex = (p.type == 'b' ? 4 : 0);
			var endIndex = (p.type == 'r' ? 4 : 8);
			for (var dir = startIndex; dir < endIndex; ++dir)
			{
				var dirOffset = getDirectionOffset(dir);
				var target = i + dirOffset;
				for (var j = 0; j < numSquaresToEdge[dir][i]; ++j)
				{
					if (board[target] && board[target].team != team)
					{
						moves.push(new move(i, target, MOVE_CAPTURE));
						break;
					}
					else if (board[target]) // we have hit teammate
						break;
						
					moves.push(new move(i, target, MOVE_NORMAL));
					target += dirOffset;
				}
			}
			break;
			case 'n':
			for (var j = 0; j < knightMoves.length; ++j)
			{
				var vertDir = (knightMoves[j][1] > 0 ? DIR_N : DIR_S);
				var horiDir = (knightMoves[j][2] > 0 ? DIR_E : DIR_W);
				var offset = knightMoves[j][0];
				var p = board[i + offset];
				if (numSquaresToEdge[vertDir][i] >= Math.abs(knightMoves[j][1]) && numSquaresToEdge[horiDir][i] >= Math.abs(knightMoves[j][2]))
				{
					if (!p)
						moves.push(new move(i, i + offset, MOVE_NORMAL));
					else if (p.team != team)
						moves.push(new move(i, i + offset, MOVE_CAPTURE));
				}
			}
			break;
			case 'k':
			for (var j = 0; j < kingMoveOffsets.length; ++j)
			{
				var vertDir = (kingMoveOffsets[j][0] > 0 ? DIR_N : DIR_S);
				var horiDir = (kingMoveOffsets[j][1] > 0 ? DIR_E : DIR_W);
				var offset = kingMoveOffsets[j][1] - 8 * kingMoveOffsets[j][0];
				//console.log(offset);
				var p = board[i + offset];
				if (numSquaresToEdge[vertDir][i] >= Math.abs(kingMoveOffsets[j][0]) && numSquaresToEdge[horiDir][i] >= Math.abs(kingMoveOffsets[j][1]))
				{
					if (!p)
						moves.push(new move(i, i + offset, MOVE_NORMAL));
					else if (p.team != team)
						moves.push(new move(i, i + offset, MOVE_CAPTURE));
				}
			}
			if (numKingMoves[team] == 0)
			{
				var sc = board[i + 3];
				var lc = board[i - 4];
				if (sc && sc.type == 'r' && sc.team == team && !board[i + 1] && !board[i + 2])
					moves.push(new move(i, i + 2, MOVE_CASTLE));
				if (lc && lc.type == 'r' && lc.team == team && !board[i - 1] && !board[i - 2])
					moves.push(new move(i, i - 2, MOVE_CASTLE));
			}
			break;
		}
	}
	return moves;
}

function getLegalMoves(team)
{
	var legalMoves = [];
	var moves = getMoves(team);
	for (var i = 0; i < moves.length; ++i)
	{
		var m = moves[i];
		playMove(m);
		var enemyMoves = getMoves(!team);
		var ok = true;
		for (var j = 0; j < enemyMoves.length; ++j)
		{
			var em = enemyMoves[j];
			if (em.dstPiece == 'k')
			{
				ok = false;
				break;
			}
		}
		if (ok)
			legalMoves.push(m);
		unplayLastMove();
	}
	return legalMoves;
}

function evaluate(turn)
{
	switch (getGameState(turn))
	{
		case GAME_WIN: 
		return +1000;
		case GAME_LOSE: 
		return -1000;
		case GAME_STALEMATE:
		case GAME_THREEFOLD:
		return 0;
		default:
		var e = 0;
		for (var piece of board)
		{
			if (piece)
			{
				var type = piece.type;
				var multiplier = piece.team ? +1 : -1;
				var value = type == 'p' ? 1 : type == 'n' ? 3 : type == 'b' ? 3 : type == 'r' ? 5 : type == 'q' ? 9 : 0;
				e += value * multiplier;
			}
		}
		return e;
	}
}

var bestMove = null;
function mm(depth, minimising, alpha, beta, firstIteration = true)
{
	if (depth == 0 || getGameState(!minimising) != GAME_INPROGRESS)
		return evaluate();
	if (minimising)
	{
		var moves = getLegalMoves(false);
		var score = +10000;
		for (var i = 0; i < moves.length; ++i)
		{
			var move = moves[i];
			playMove(move);
			var e = mm(depth - 1, !minimising, alpha, beta, false);
			beta = Math.min(beta, e);
			if (e < score)
			{
				score = e;
				if (firstIteration)
					bestMove = move;
			}
			unplayLastMove();
			if (beta <= alpha)
				break;
		}
		return score;
	}
	else
	{
		var moves = getLegalMoves(true);
		var score = -10000;
		for (var i = 0; i < moves.length; ++i)
		{
			var move = moves[i];
			playMove(move);
			var e = mm(depth - 1, !minimising, alpha, beta, false);
			alpha = Math.max(alpha, e);
			score = Math.max(score, e);
			unplayLastMove();
			if (beta <= alpha)
				break;
		}
		return score;
	}
}

function getRandomMove(team)
{
	var moves = getLegalMoves(team);
	if (moves.length == 0)
		return;

	var index = Math.floor(Math.random() * moves.length);
	return moves[index];
}

function getOpeningMove()
{
	var openingMoves = [];
	if (boardMoves[0].dst != 35)
		openingMoves.push(new move(12, 28, MOVE_DOUBLE_MOVE));
	openingMoves.push(new move(11, 27, MOVE_DOUBLE_MOVE));
	var index = Math.floor(Math.random() * openingMoves.length);
	return openingMoves[index];
}

function aiMakeMove()
{
	var e = mm(4, true, -10000, 10000);
	if (boardMoves.length == 1)
		aiMove = getOpeningMove();
	else
		aiMove = bestMove;
}

function onKeyDown(event)
{
	var key = event.key;
	if (gameState == GAME_INPROGRESS) return;
	if (key == "ArrowLeft" && boardMoves.length > 0)
	{
		var lastMove = unplayLastMove();
		oldBoardMoves.push(lastMove);
	}
	else if (key == "ArrowRight" && oldBoardMoves.length > 0)
	{
		playMove(oldBoardMoves[oldBoardMoves.length - 1]);
		oldBoardMoves.pop();
	}
}

function onMouseDown(e)
{
	var x = e.pageX - canvas.offsetLeft;
	var y = e.pageY - canvas.offsetTop;
	
	if (gameState != GAME_INPROGRESS)
		return;
	var i = Math.floor(x * 8 / canvas.width) + Math.floor(y * 8 / canvas.height) * 8;
	if (board[i])
	{
		selectedIndex = i;
		selectedX = x;
		selectedY = y;
	}
	//console.log("down at " + i);
}

function onMouseMove(e)
{
	var x = e.pageX - canvas.offsetLeft;
	var y = e.pageY - canvas.offsetTop;
	
	if (selectedIndex >= 0 && selectedIndex < 64)
	{
		selectedX = x;
		selectedY = y;
	}
	
	//console.log("moved at " + x + ", " + y);
}

function onMouseUp(e)
{
	var x = e.pageX - canvas.offsetLeft;
	var y = e.pageY - canvas.offsetTop;
	
	if (selectedIndex >= 0 && selectedIndex < 64)
	{
		var i = Math.floor(x * 8 / canvas.width) + Math.floor(y * 8 / canvas.height) * 8;
		if (i >= 0 && i < 64 && i != selectedIndex)
		{
			// check if move is legal
			var p = board[selectedIndex];
			//var moves = getLegalMoves(playerTurn);
			var attemptedMove = new move(selectedIndex, i);
			var index = legalMoves.findIndex(a => (a.src == attemptedMove.src && a.dst == attemptedMove.dst));
			if (index != -1)
			{
				playMove(legalMoves[index]);
				playerTurn = !playerTurn;
				gameState = getGameState(playerTurn);
				console.log(evaluate());
			}
		}
	}
	
	selectedIndex = -1;
	
	//console.log("up at " + x + ", " + y);
}

const pieceImgIndices = ['b', 'k', 'n', 'p', 'q', 'r'];
function drawPiece(p, x, y, size)
{
	var index = pieceImgIndices.indexOf(p.type) + p.team * 6;
	context.drawImage(pieceImages[index], x, y, size, size);
	/*context.font = size + " Arial";
	context.fillStyle = (p.team ? "white" : "gray");
	context.fillText(p.type, x, y);*/
}

// draws moves of selected piece
function drawLegalMoves(selected, moves)
{
	for (var i = 0; i < moves.length; ++i)
	{
		var m = moves[i];
		if (m.src == selected)
		{
			var dst = m.dst;
			context.beginPath();
			if (m.type & MOVE_CAPTURE || m.type & MOVE_ENPASSANT)
				context.fillStyle = "rgba(255, 0, 0, 0.4)"; // capture move
			else
				context.fillStyle = "rgba(0, 0, 255, 0.4)"; // normal move
			context.rect((dst - 8 * Math.floor(dst / 8)) * canvas.width / 8, Math.floor(dst / 8) * canvas.height / 8, canvas.width / 8, canvas.height / 8);
			context.fill();
		}
	}
}

function update()
{
	if (!playerTurn && gameState == GAME_INPROGRESS && !aiMove)
		aiMakeMove();
	else if (aiMove && aiMoveLerpFraction >= 1.00)
	{	
		playMove(aiMove);
		aiMove = null;
		aiMoveLerpFraction = 0.00;
		playerTurn = !playerTurn;
		gameState = getGameState(playerTurn);
		console.log(evaluate());
	}

	if (playerTurn && !loadedMoves)
	{
		loadedMoves = true;
		legalMoves = getLegalMoves(true);
	}
	else if (!playerTurn)
		loadedMoves = false;
}

const darkColor = "#B58863";
const lightColor = "#F0D9B5";

var loadedMoves = false;
var legalMoves = [];

var aiMove = null; // for animation
var aiMoveLerpFraction = 0.00;
// this also calls aiMakeMoves()
function draw()
{
	context.clearRect(0, 0, canvas.width, canvas.height);
	var s = canvas.width / 8;
	
	var x = 0, y = 0;
	for (var i = 0; i < 64; ++i)
	{
		context.beginPath();
		context.fillStyle = (Math.floor(i / 8)) % 2 ? (i % 2 ? lightColor : darkColor) : (i % 2 ? darkColor : lightColor);
		context.rect(x,y,s,s);
		//context.stroke();
		context.fill();
		
		var p = board[i];
		if (p && i != selectedIndex && (!aiMove || i != aiMove.src))
		{
			var centerX = x + s/2 - 8;
			var centerY = y + s/2 + 8;
			drawPiece(p, x, y, s);
		}
		
		if ((i + 1) % 8 == 0)
		{
			y += s;
			x = 0;
		}
		else
		{
			x += s;
		}
	}
	
	if (loadedMoves && selectedIndex >= 0 && selectedIndex < 64)
		drawLegalMoves(selectedIndex, legalMoves);
	
	// draw selected piece
	if (selectedIndex >= 0 && selectedIndex < 64)
	{
		var p = board[selectedIndex];
		var x = selectedX - s*1.5/2;
		var y = selectedY - s*1.5/2;
		drawPiece(p, x, y, s * 1.5);
	}

	if (aiMove && aiMoveLerpFraction < 1 && board[aiMove.src])
	{
		aiMoveLerpFraction += 0.1;
		var srcX = (aiMove.src - Math.floor(aiMove.src / 8) * 8) * s;
		var srcY = Math.floor(aiMove.src / 8) * s;
		var dstX = (aiMove.dst - Math.floor(aiMove.dst / 8) * 8) * s;
		var dstY = Math.floor(aiMove.dst / 8) * s;
		drawPiece(board[aiMove.src], srcX + (dstX - srcX) * aiMoveLerpFraction, srcY + (dstY - srcY) * aiMoveLerpFraction, s);
	}
	

	if (gameState != GAME_INPROGRESS)
	{
		resultText.innerHTML = gameState == GAME_WIN ? "You win!" : gameState == GAME_STALEMATE ? "Draw by stalemate!" 
		: gameState == GAME_THREEFOLD ? "Draw by repetition!" : gameState == GAME_LOSE ? "You lost!" : "The game ended!?!";
	}
	
	window.requestAnimationFrame(draw);
}

function setup()
{
	console.log("setup");
	const bois = ['r', 'n', 'b', 'q', 'k', 'b', 'n', 'r'];
	for (var i = 0; i < 8; ++i)
	{
		board[i] = new piece(bois[i], false);
	}
	for (var i = 8; i < 16; ++i)
	{
		board[i] = new piece('p', false);
	}
	for (var i = 16; i < 48; ++i)
	{
		board[i] = null;
	}
	for (var i = 48; i < 56; ++i)
	{
		board[i] = new piece('p', true);
	}
	for (var i = 56; i < 64; ++i)
	{
		board[i] = new piece(bois[i - 56], true);
	}
	
	// get num of squares to edge for each direction for each square
	if (numSquaresToEdge.length == 0)
	{
		for (var i = 0; i < 8; ++i)
			numSquaresToEdge.push(new Array());
	}
	for (var i = 0; i < 64; ++i)
	{
		numSquaresToEdge[DIR_N].push(Math.floor(i / 8));
		numSquaresToEdge[DIR_E].push((i < 8 ? 7 - i : 7 - (i % 8)));
		numSquaresToEdge[DIR_S].push(7 - Math.floor(i / 8));
		numSquaresToEdge[DIR_W].push((i < 8 ? i : i % 8));
		numSquaresToEdge[DIR_NE].push(Math.min(numSquaresToEdge[DIR_N][i], numSquaresToEdge[DIR_E][i]));
		numSquaresToEdge[DIR_SE].push(Math.min(numSquaresToEdge[DIR_S][i], numSquaresToEdge[DIR_E][i]));
		numSquaresToEdge[DIR_SW].push(Math.min(numSquaresToEdge[DIR_S][i], numSquaresToEdge[DIR_W][i]));
		numSquaresToEdge[DIR_NW].push(Math.min(numSquaresToEdge[DIR_N][i], numSquaresToEdge[DIR_W][i]));
	}
}

window.onload = function()
{
	canvas = document.getElementById("canvas");
	resultText = document.getElementById("result");
	context = canvas.getContext("2d");
	
	const imgIndices = ["bB", "bK", "bN", "bP", "bQ", "bR", "wB", "wK", "wN", "wP", "wQ", "wR"];
	for (var i = 0; i < pieceImages.length; ++i)
	{
		pieceImages[i] = new Image();
		pieceImages[i].src = "assets/" + imgIndices[i] + ".svg";
	}

	canvas.onmousedown = onMouseDown;
	canvas.ontouchstart = onMouseDown;
	canvas.onmousemove = onMouseMove;
	canvas.ontouchmove = onMouseMove;
	canvas.onmouseup = onMouseUp;
	canvas.ontouchend = onMouseUp;
	document.addEventListener("keydown", onKeyDown);
	
	setup();
	draw();

	setInterval(update, 50);
}