const express = require("express");
const app = express();

app.get("/", (req, res) => {
  res.send("🚀 Node.js App Deployed using Docker & Terraform!--update-ansible- Node.js App Deployed using Docker + Ansible + EC2");
});

app.get("/test", (req, res) => {
    res.json({
        message: "Updated version deployed successfully ✅",
        version: "v2 test"
      });
})

const PORT = 3000;
app.listen(PORT, () => {
  console.log(`Server running on--- port ${PORT}`);
});
