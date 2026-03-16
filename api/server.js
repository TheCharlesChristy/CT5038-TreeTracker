const express = require("express");
const cors = require("cors");
const path = require("path");

const app = express();

const corsOptions = {
  origin: ["http://localhost:8081"],
  methods: ["GET", "POST", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
};

app.use(cors(corsOptions));
app.options("*", cors(corsOptions));

app.use(express.json());
app.use("/uploads", express.static(path.join(__dirname, "uploads")));
app.use(express.urlencoded({ extended: true }));

app.get("/api", (req, res) => {
res.json({ message: "Tree API working" });
});

// =============================
// Routes
// =============================
const uploadPhotos = require("./routes/upload-photos");
app.use("/api", uploadPhotos);

// =============================
const refresh = require("./routes/refresh");
app.use("/api", refresh);

// =============================
const logout = require("./routes/logout");
app.use("/api", logout);

// =============================
const getTreeDetails = require("./routes/get-tree-details");
app.use("/api", getTreeDetails);

// =============================
const addTreeData = require("./routes/add-tree-data");
app.use("/api", addTreeData);

// =============================
const registerRoute = require("./routes/register");
app.use("/api", registerRoute);

// =============================
const loginRoute = require("./routes/login");
app.use("/api", loginRoute);

// =============================
const userControllerRoute = require("./routes/user-controller");
app.use("/api", userControllerRoute);

// ==============================
// Plesk automatically proxies to Node
const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
console.log("Server running on port 3000");
});