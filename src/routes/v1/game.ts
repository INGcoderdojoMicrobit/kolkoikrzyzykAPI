import { Request, Response, Router } from "express";

const router = Router();

router.get("/games", async (req: Request, res: Response) => {
  if (!req.userId) return res.status(401).send("Unauthorized");

  const games = await req.prisma.game.findMany({
    where: {
      status: "waiting"
    },
    select: {
      id: true,
      createdAt: true,
      user1: true,
      user2: true,
      status: true
    }
  });

  res.json(games);
});

// zakladamy, ze user1 jest "X" a user2 jest "O"
router.post("/game/create", async (req: Request, res: Response) => {
  if (!req.userId) return res.status(401).send("Unauthorized");

  const avaliableGames = await req.prisma.game.findMany({
    where: {
      status: "waiting"
    }
  });

  if (avaliableGames.length > 0) {
    if (avaliableGames[0].user1 == req.userId) return res.status(400).send("You are already in a game");

    const game = await req.prisma.game.update({
      where: {
        id: avaliableGames[0].id
      },
      data: {
        user2: BigInt(req.userId.toString()),
        status: "playing",
        nextMove: BigInt(Math.random() > 0.5 ? avaliableGames[0].user1.toString() : req.userId.toString()) //losujemy kto rozpoczyna grę
      }
    });

    return res.json(game);
  }

  const game = await req.prisma.game.create({
    data: {
      user1: BigInt(req.userId.toString()),
      status: "waiting",
      board: {
        create: {
          row1: ["", "", ""],
          row2: ["", "", ""],
          row3: ["", "", ""],
        },
      },
    },
    select: {
      id: true,
      createdAt: true,
      user1: true,
      user2: true,
      status: true,
      board: true,
      nextMove: true
    }
  });

  res.send(game);
});

// funkcja zwraca plansze o podany gameid i status gry
// robimy strefe kibica - kazdy zalogowany moze wyswietlic dowolna plansze
router.get("/board", async (req: Request, res: Response) => {
  if (!req.userId) return res.status(401).send("Unauthorized");
  if (!req.query.gameid) return res.status(400).send("Bad request");

  const queryboard = await req.prisma.game.findUnique({
    where: {
      id: BigInt(req.query.gameid.toString())
    },
    select: {
      board: true,
      status: true
    }
  });

  res.send(queryboard);
});

// funkcja sprawdza czy moge wykonac ruch w grze gameid
router.get("/checknextmove", async (req: Request, res: Response) => {
  if (!req.userId) return res.status(401).send("Unauthorized");
  if (!req.query.gameid) return res.status(400).send("Bad request");

  const queryboard = await req.prisma.game.findUnique({
    where: {
      id: BigInt(req.query.gameid.toString())
    },
    select: {
      user1: true,
      user2: true,
      status: true,
      nextMove: true
    }
  });

  if (!queryboard) return res.status(404).send("Game not found"); //nie ma takiego ID gry
  if (queryboard.status != "playing") return res.status(400).send("Game not in playing status");
  if (queryboard.user1 != req.userId && queryboard.user2 != req.userId)
    return res.status(403).send("You are not player in this game");
  res.json(queryboard.nextMove == req.userId ? true : false);
});

// funkcja sprawdza jaki jest mój symbol w grze gameid
router.get("/checkmysymbolingame", async (req: Request, res: Response) => {
  if (!req.userId) return res.status(401).send("Unauthorized");
  if (!req.query.gameid) return res.status(400).send("Bad request");

  const queryboard = await req.prisma.game.findUnique({
    where: {
      id: BigInt(req.query.gameid.toString())
    },
    select: {
      user1: true,
      user2: true,
      status: true,
      nextMove: true
    }
  });

  if (!queryboard) return res.status(404).send("Game not found"); //nie ma takiego ID gry
  if (queryboard.user1 != req.userId && queryboard.user2 != req.userId)
    return res.status(403).send("You are not player in this game");

  if (queryboard.user1 == req.userId) res.json("X");
  else if (queryboard.user2 == req.userId) res.json("O");
  else return res.status(500).send("Internal server error");
});

// funkcja ruchu w grze - wysyłamy:
// gameid=
// row=
// col=
// co powoduje wstawienie odpowiedniego symbolu na plansz


router.post("/move", async (req: Request, res: Response) => {
  if (!req.userId) return res.status(401).send("Unauthorized");
  if (!req.query.gameid) return res.status(400).send("Bad request");
  if (!req.query.row) return res.status(400).send("Bad request"); //nie podano wiersza
  if (Number(req.query.row) < 0 || Number(req.query.row) > 2) return res.status(400).send("Bad request"); //zła wartość wiersza
  if (!req.query.col) return res.status(400).send("Bad request"); //nie podano kolumny
  if (Number(req.query.col) < 0 || Number(req.query.col) > 2) return res.status(400).send("Bad request"); //zła wartość kolumny

  const queryboard = await req.prisma.game.findUnique({
    where: {
      id: BigInt(req.query.gameid.toString())
    },
    select: {
      user1: true,
      user2: true,
      status: true,
      nextMove: true,
      board: true,
      winner: true
    }
  });

  if (!queryboard) return res.status(404).send("Game not found"); //nie ma takiego ID gry
  if (queryboard.status != "playing") return res.status(401).send("Game not in playing status"); //gra nie w toku
  if (queryboard.user1 != req.userId && queryboard.user2 != req.userId)
    return res.status(403).send("You are not player in this game"); //nie jesteś graczem w tej grze
  if (queryboard.nextMove != req.userId) return res.status(401).send("Not your turn"); //nie jest twoja kolej

  /*
          row1: ['', '', '']
     row  row2: ['', '', '']
          row3: ['', '', '']
      
      */

  if (!queryboard.board) return res.status(401).send("Query board - brak planszy"); //brak planszy
  
  let row: string[];
  if(Number(req.query.row) === 0) row = queryboard.board.row1;
  else if(Number(req.query.row) === 1) row = queryboard.board.row2;
  else if(Number(req.query.row) === 2) row = queryboard.board.row3;
  else return res.status(400).send("Bad request"); //zła wartość wiersza
  
  if(row[Number(req.query.col)] != '') return res.status(409).send("Field is not empty"); //pole zajęte

  if (queryboard.user1 == req.userId) row[Number(req.query.col)] = "X"; 
  else if (queryboard.user2 == req.userId) row[Number(req.query.col)] = "O";

  let kolko = false;
  let krzyzyk = false;

  if (queryboard.board.row1[0] === "O" && queryboard.board.row1[1] === "O" && queryboard.board.row1[2] === "O") 
  {
    kolko = true;
  }
  if (queryboard.board.row2[0] === "O" && queryboard.board.row2[1] === "O" && queryboard.board.row2[2] === "O") 
  {
    kolko = true;
  }
  if (queryboard.board.row3[0] === "O" && queryboard.board.row3[1] === "O" && queryboard.board.row3[2] === "O") 
  {
    kolko = true;
  }
  if (queryboard.board.row1[0] === "O" && queryboard.board.row2[0] === "O" && queryboard.board.row3[0] === "O") 
  {
    kolko = true;
  }
  if (queryboard.board.row1[1] === "O" && queryboard.board.row2[1] === "O" && queryboard.board.row3[1] === "O") 
  {
    kolko = true;
  }
  if (queryboard.board.row1[2] === "O" && queryboard.board.row2[2] === "O" && queryboard.board.row3[2] === "O") 
  {
    kolko = true;
  }
  if (queryboard.board.row1[0] === "O" && queryboard.board.row2[1] === "O" && queryboard.board.row3[2] === "O") 
  {
    kolko = true;
  }
  if (queryboard.board.row1[2] === "O" && queryboard.board.row2[1] === "O" && queryboard.board.row3[0] === "O") 
  {
    kolko = true;
  }

// to samo sprawdzenie dla krzyzyka
  if (queryboard.board.row1[0] === "X" && queryboard.board.row1[1] === "X" && queryboard.board.row1[2] === "X") 
  {
    krzyzyk = true;
  }
  if (queryboard.board.row2[0] === "X" && queryboard.board.row2[1] === "X" && queryboard.board.row2[2] === "X") 
  {
    krzyzyk = true;
  }
  if (queryboard.board.row3[0] === "X" && queryboard.board.row3[1] === "X" && queryboard.board.row3[2] === "X") 
  {
    krzyzyk = true;
  }
  if (queryboard.board.row1[0] === "X" && queryboard.board.row2[0] === "X" && queryboard.board.row3[0] === "X") 
  {
    krzyzyk = true;
  }
  if (queryboard.board.row1[1] === "X" && queryboard.board.row2[1] === "X" && queryboard.board.row3[1] === "X") 
  {
    krzyzyk = true;
  }
  if (queryboard.board.row1[2] === "X" && queryboard.board.row2[2] === "X" && queryboard.board.row3[2] === "X") 
  {
    krzyzyk = true;
  }
  if (queryboard.board.row1[0] === "X" && queryboard.board.row2[1] === "X" && queryboard.board.row3[2] === "X") 
  {
    krzyzyk = true;
  }
  if (queryboard.board.row1[2] === "X" && queryboard.board.row2[1] === "X" && queryboard.board.row3[0] === "X") 
  {
    krzyzyk = true;
  }

  if (kolko || krzyzyk) 
  {
    queryboard.status = 'won';
  }

  if (kolko) 
  {
    queryboard.winner = queryboard.user2;
  }

  if (krzyzyk) 
  {
    queryboard.winner = queryboard.user1;
  }
  

  const gameupdate = await req.prisma.game.update({
    where: {
      id: BigInt(req.query.gameid.toString())
    },
    data: {
      nextMove: queryboard.nextMove == queryboard.user1 ? queryboard.user2 : queryboard.user1,
      status: queryboard.status,
      winner: queryboard.winner
    },
    select:{
      id: true,
      board: true,
      winner: true,
      user1: true,
      user2: true,
      createdAt: true,
      updatedAt: true,
      status: true,
    }
  });

  res.json(gameupdate);
});

module.exports = router;
