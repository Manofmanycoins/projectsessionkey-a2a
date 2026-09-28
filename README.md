# Project Sessionkey A2A Client

Agent B for the Basename Club Project Vegetables / Project Sessionkey test.

Identity:
- Basename: sessionkey.base.eth
- ERC-8004 Agent: #95962
- Operational wallet: 0xAB05Ea86008615F8808d18f966109527BbB99981

Behavior:
1. Fetches Project Vegetables' public A2A Agent Card.
2. Selects the advertised A2A v1 HTTP+JSON interface.
3. Derives /message:send from the discovered interface.
4. Sends an A2A v1 message with A2A-Version: 1.0.
5. Receives and parses Vegetables' response.
6. Returns the discovery evidence, outbound message, and inbound response.

Endpoints after deployment:
- GET /      status
- GET /run   execute the complete discovery -> A2A call
- POST /run  execute with JSON {"message":"custom text"}

No private keys, seed phrases, or wallet signing capability are included.
