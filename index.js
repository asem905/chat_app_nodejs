const app = require("./app");
require("dotenv").config();
const port = process.env.PORT;
const { sequelize } = require("./configs/db.config");
app.get("/", (req, res) => {
  res.send("Welcome to the Chat App API");
});

async function startServer() {
  try {
    await sequelize.sync({ force: true });
    app.listen(port, () => {
      console.log(`Server is running on http://localhost:${port}`);
    });
  } catch (error) {
    console.error("Unable to connect to the database:", error);
  }
}

startServer();
