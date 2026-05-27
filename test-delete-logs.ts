import fetch from "node-fetch";

async function run() {
  const getRes = await fetch("http://localhost:3000/api/admin/logs?token=CRON_INTERNAL");
  console.log("GET status:", getRes.status);
  
  const delRes = await fetch("http://localhost:3000/api/admin/logs?token=CRON_INTERNAL", {
    method: "DELETE"
  });
  console.log("DELETE status:", delRes.status, await delRes.text());
}
run();
