const jsonServer = require("json-server");
const crypto = require("crypto");

const server = jsonServer.create();
const router = jsonServer.router('./db.json');
const middlewares = jsonServer.defaults();

server.use(middlewares);
server.use(jsonServer.bodyParser);

// Simulate network delay
server.use((req, res, next) => setTimeout(next, 300));

server.get('/carrier/shipments/:orderId', (req, res) => {
    const orderId = req.params.orderId
    const db = router.db

    const deliveryStatus = db.get("shipments").find({ orderId }).value()

    return res.status(200).json(deliveryStatus)

})

server.post('/carrier/shipments', (req, res) => {
    const db = router.db
    const newShipment = {
        id: crypto.randomUUID(),
        ...req.body,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
    };

    db.get("shipments").push(newShipment).write();
    return res.status(201).json(newShipment)
})

server.patch('/carrier/shipments/:id', (req, res) => {
    const db = router.db
    const orderId = req.params.id;
    const existingShipment = db.get("shipments").find({ orderId }).value()

    if (existingShipment) {
        db.get("shipments")
        .find({ orderId })
        .assign({ ...req.body, orderId, updatedAt: new Date().toISOString() })
        .write()
    }
    const updated = db.get("shipments").find({orderId}).value()
    return res.json(updated)
})

server.use(router);

server.listen(4001, () => {
    console.log('Carrier Mock API is running on http://localhost:4001');
})