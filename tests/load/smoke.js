import http from "k6/http";
import { check, sleep } from "k6";

export const options = {
  vus: 10,
  duration: "30s",
  thresholds: {
    http_req_failed: ["rate<0.01"],
    http_req_duration: ["p(95)<600"],
  },
};

const BASE_URL = __ENV.BASE_URL || "http://127.0.0.1:3000";

function smokeLoadTest() {
  const pages = ["/", "/leaderboard"];

  for (const path of pages) {
    const res = http.get(`${BASE_URL}${path}`);
    check(res, {
      [`GET ${path} status is 200`]: (r) => r.status === 200,
    });
  }

  sleep(1);
}

export default smokeLoadTest;
