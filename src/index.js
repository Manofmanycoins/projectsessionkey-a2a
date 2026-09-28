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

async function sendA2AMessage(endpoint, message) {
  const messageId =
    typeof crypto.randomUUID === "function"
      ? crypto.randomUUID()
      : `sessionkey-${Date.now()}`;

  const response = await fetch(`${endpoint}/message:send`, {
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
  });

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

async function runAgentToAgentTest(env) {
  const started = new Date().toISOString();

  const discovery = await discoverVegetables(env);

  const vegetablesIdentity = {
    name: discovery.card.name,
    description: discovery.card.description,
    version: discovery.card.version,
    interface: discovery.endpoint
  };

  const message =
    "Hello Project Vegetables. This is Project Sessionkey, " +
    "sessionkey.base.eth, ERC-8004 Agent #95962. " +
    "Identify yourself with your Basename and ERC-8004 Agent ID.";

  const response = await sendA2AMessage(
    discovery.endpoint,
    message
  );

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

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (request.method === "OPTIONS") {
      return new Response(null, {
        status: 204,
        headers
      });
    }

    if (request.method === "GET" && url.pathname === "/") {
      return json({
        service: "Project Sessionkey A2A Client",
        basename: SESSIONKEY.basename,
        erc8004Agent: SESSIONKEY.agentId,
        wallet: SESSIONKEY.wallet,
        purpose:
          "Autonomous discovery and A2A communication with Project Vegetables",
        testEndpoint: "/test",
        status: "ready"
      });
    }

    if (
      request.method === "GET" &&
      url.pathname === "/discover"
    ) {
      try {
        const discovery = await discoverVegetables(env);

        return json({
          success: true,
          discoverySource: VEGETABLES_DISCOVERY,
          discoveredEndpoint: discovery.endpoint,
          agentCard: discovery.card
        });
      } catch (error) {
        return json(
          {
            success: false,
            error: error.message
          },
          502
        );
      }
    }

    if (
      request.method === "GET" &&
      url.pathname === "/test"
    ) {
      try {
        return json(await runAgentToAgentTest(env));
      } catch (error) {
        return json(
          {
            success: false,
            agent: SESSIONKEY.name,
            error: error.message
          },
          502
        );
      }
    }

    return json(
      {
        error: "Not found",
        availableEndpoints: ["/", "/discover", "/test"]
      },
      404
    );
  }
};
