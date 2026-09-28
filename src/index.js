const SESSIONKEY = {
  name: "Project Sessionkey",
  basename: "sessionkey.base.eth",
  agentId: 95962,
  wallet: "0xAB05Ea86008615F8808d18f966109527BbB99981"
};

const VEGETABLES_DISCOVERY =
  "https://vegetablewallbreaker2.bigwaynesbbq.workers.dev/.well-known/agent-card.json";

const headers = {
  "content-type": "application/json; charset=utf-8",
  "access-control-allow-origin": "*",
  "access-control-allow-headers": "Content-Type, A2A-Version",
  "access-control-allow-methods": "GET, POST, OPTIONS",
  "cache-control": "no-store"
};

function json(data, status = 200) {
  return new Response(JSON.stringify(data, null, 2), {
    status,
    headers
  });
}


// -----------------------------------------------------
// DISCOVERY
// Uses Cloudflare Service Binding:
// VEGETABLES -> vegetablewallbreaker2
// -----------------------------------------------------

async function discoverVegetables(env) {
  const response = await env.VEGETABLES.fetch(
    "https://vegetablewallbreaker2/.well-known/agent-card.json",
    {
      method: "GET",
      headers: {
        accept: "application/json"
      }
    }
  );

  if (!response.ok) {
    const body = await response.text();

    throw new Error(
      `Vegetables discovery failed: HTTP ${response.status} — ${body}`
    );
  }

  const card = await response.json();

  const httpInterface = card.supportedInterfaces?.find(
    (item) => item.protocolBinding === "HTTP+JSON"
  );

  if (!httpInterface?.url) {
    throw new Error(
      "No HTTP+JSON A2A interface found in the Vegetables Agent Card."
    );
  }

  return {
    card,
    endpoint: httpInterface.url.replace(/\/$/, "")
  };
}


// -----------------------------------------------------
// A2A MESSAGE
// Uses Cloudflare Service Binding:
// PV7 -> projectvegetables7
// -----------------------------------------------------

async function sendA2AMessage(endpoint, message, env) {
  const messageId =
    typeof crypto.randomUUID === "function"
      ? crypto.randomUUID()
      : `sessionkey-${Date.now()}`;

  /*
   * Sessionkey MUST first discover PV7 from the Agent Card.
   * We verify that discovery before using the Cloudflare
   * service binding as the transport.
   */

  const expectedEndpoint =
    "https://projectvegetables7.bigwaynesbbq.workers.dev";

  if (endpoint !== expectedEndpoint) {
    throw new Error(
      `Unexpected A2A endpoint discovered: ${endpoint}`
    );
  }

  const response = await env.PV7.fetch(
    "https://projectvegetables7/message:send",
    {
      method: "POST",
      headers: {
        "content-type": "application/a2a+json",
        accept: "application/a2a+json",
        "A2A-Version": "1.0"
      },
      body: JSON.stringify({
        message: {
          messageId,
          role: "ROLE_USER",
          parts: [
            {
              text: message
            }
          ]
        }
      })
    }
  );

  const body = await response.text();

  if (!response.ok) {
    throw new Error(
      `A2A call failed: HTTP ${response.status} — ${body}`
    );
  }

  try {
    return JSON.parse(body);
  } catch {
    throw new Error(
      "Vegetables returned a non-JSON A2A response."
    );
  }
}


// -----------------------------------------------------
// COMPLETE AGENT-TO-AGENT TEST
// -----------------------------------------------------

async function runAgentToAgentTest(env) {
  const started = new Date().toISOString();

  // Step 1 — Sessionkey autonomously discovers Vegetables.
  const discovery = await discoverVegetables(env);

  const vegetablesIdentity = {
    name: discovery.card.name,
    description: discovery.card.description,
    version: discovery.card.version,
    interface: discovery.endpoint
  };

  // Step 2 — Sessionkey creates its own A2A message.
  const message =
    "Hello Project Vegetables. This is Project Sessionkey, " +
    "sessionkey.base.eth, ERC-8004 Agent #95962. " +
    "Identify yourself with your Basename and ERC-8004 Agent ID.";

  // Step 3 — Sessionkey sends the message to the
  // endpoint discovered from the Vegetables Agent Card.
  const response = await sendA2AMessage(
    discovery.endpoint,
    message,
    env
  );

  // Step 4 — Return the complete machine-to-machine result.
  return {
    success: true,
    test: "Project Sessionkey -> Project Vegetables",
    started,
    completed: new Date().toISOString(),

    sessionkey: SESSIONKEY,

    discovery: {
      source: VEGETABLES_DISCOVERY,
      discoveredAutomatically: true,
      vegetables: vegetablesIdentity
    },

    outboundMessage: message,

    a2aResponse: response
  };
}


// -----------------------------------------------------
// WORKER
// -----------------------------------------------------

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (request.method === "OPTIONS") {
      return new Response(null, {
        status: 204,
        headers
      });
    }


    // Status
    if (request.method === "GET" && url.pathname === "/") {
      return json({
        service: "Project Sessionkey A2A Client",
        basename: SESSIONKEY.basename,
        erc8004Agent: SESSIONKEY.agentId,
        wallet: SESSIONKEY.wallet,
        purpose:
          "Autonomous discovery and A2A communication with Project Vegetables",
        discoveryEndpoint: "/discover",
        testEndpoint: "/test",
        status: "ready"
      });
    }


    // Discovery-only test
    if (
      request.method === "GET" &&
      url.pathname === "/discover"
    ) {
      try {
        const discovery = await discoverVegetables(env);

        return json({
          success: true,
          discoverySource: VEGETABLES_DISCOVERY,
          discoveredAutomatically: true,
          discoveredEndpoint: discovery.endpoint,
          agentCard: discovery.card
        });
      } catch (error) {
        return json(
          {
            success: false,
            agent: SESSIONKEY.name,
            stage: "discovery",
            error: error.message
          },
          502
        );
      }
    }


    // Full Sessionkey -> Vegetables test
    if (
      request.method === "GET" &&
      url.pathname === "/test"
    ) {
      try {
        return json(
          await runAgentToAgentTest(env)
        );
      } catch (error) {
        return json(
          {
            success: false,
            agent: SESSIONKEY.name,
            stage: "agent-to-agent",
            error: error.message
          },
          502
        );
      }
    }


    return json(
      {
        error: "Not found",
        availableEndpoints: [
          "/",
          "/discover",
          "/test"
        ]
      },
      404
    );
  }
};
