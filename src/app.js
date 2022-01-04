const express = require('express');
const bodyParser = require('body-parser');
const { Op, fn, col } = require('sequelize');

const { sequelize } = require('./model');
const { getProfile } = require('./middleware/getProfile');

const app = express();
app.use(bodyParser.json());
app.set('sequelize', sequelize);
app.set('models', sequelize.models);

app.use(getProfile);

/**
 * FIX ME!
 * @returns contract by id
 */
app.get('/contracts/:id', async (req, res) => {
    const { Contract } = req.app.get('models');
    const { id } = req.params;
    const profileId = req.get('profile_id');
    const contract = await Contract.findOne({where: {id, [Op.or]: [{ ContractorId: profileId }, { ClientId: profileId }]}});
    if (!contract) return res.status(404).end();
    res.json(contract);
});

app.get('/contracts', async (req, res) => {
    const { Contract } = req.app.get('models');
    const profileId = req.get('profile_id');
    const contracts = await Contract.findAll({where: {status: {[Op.ne]: 'terminated'}, [Op.or]: [{ ContractorId: profileId }, { ClientId: profileId }]}});
    res.json(contracts);
});

app.get('/jobs/unpaid', async (req, res) => {
    const { Job, Contract } = req.app.get('models');
    const profileId = req.get('profile_id');

    const jobs = await Job.findAll({
        where: {
            paid: {[Op.is]: null},
            '$Contract.status$': { [Op.ne]: 'terminated' },
            [Op.or]: [{ '$Contract.ContractorId$': profileId }, { '$Contract.ClientId$': profileId }],
        },
        include: [{ model: Contract, required: true }]
    });
    res.json(jobs);
});

app.post('/jobs/:job_id/pay', async (req, res) => {
    const sequelize = req.app.get('sequelize');
    const { Job, Contract, Profile } = req.app.get('models');

    const jobForPay = await Job.findOne({
        where: { id: req.params.job_id, paid: {[Op.is]: null} },
        include: [{ model: Contract, where: {status: {[Op.ne]: 'terminated'}, ClientId: req.profile.id } }],
    });

    if(!jobForPay) return res.status(404).end('No job for pay');

    const jobPrice = jobForPay.price;

    if (jobPrice >= req.profile.balance) return res.status(400).end('There is not enough money on your balance to pay for the job');

    try {
        await sequelize.transaction(async (t) => {

            await Profile.increment({balance: jobPrice}, {where: {id: jobForPay.Contract.ContractorId}}, { transaction: t });
            await Profile.increment({balance: -1 * jobPrice}, {where: {id: jobForPay.Contract.ClientId}}, { transaction: t });

            return t;
        });

    } catch (error) {
        console.error(error);
        return res.status(500).end('The transaction is not successful');
    }

    res.status(200).send();
});

app.post('/balances/deposit/:userId', async (req, res) => {
    const sequelize = req.app.get('sequelize');
    const { Job, Contract, Profile } = req.app.get('models');
    const { userId } = req.params;
    const { deposit } = req.body;

    const totalJobPrices = await Job.sum('price', {
        where: {paid: {[Op.is]: null}},
        include: [{ model: Contract, where: {status: {[Op.ne]: 'terminated'}, ClientId: req.profile.id } }],
    });

    if (deposit >= totalJobPrices / 4) return res.status(400).end(`You can not deposit more than 25% of total jobs to pay (deposit: ${deposit}, total: ${totalJobPrices})`);

    try {
        await sequelize.transaction(async (t) => {

            await Profile.increment({balance: deposit}, {where: {id: userId}}, { transaction: t });
            await Profile.increment({balance: -1 * deposit}, {where: {id: req.profile.id}}, { transaction: t });

            return t;
        });

    } catch (error) {
        console.error(error);
        return res.status(500).end('The transaction is not successful');
    }

    res.status(200).send();
});

app.get('/admin/best-profession', async (req, res) => {
    const { Job, Contract, Profile } = req.app.get('models');
    const { startDate, endDate } = req.query;

    if (!startDate || !endDate) return res.status(400).end('Start date and end date must be set');

    const result = await Profile.findAll({
        where: {
            type: 'contractor',
            '$Contractor.Jobs.paid$': true,
            '$Contractor.Jobs.paymentDate$': {[Op.between]: [startDate, endDate]},
        },
        include: [{ model: Contract, required: true, as: 'Contractor', include: [{ model: Job }] }],
        group: ['Profile.profession'],
        order: [
          [fn('sum', col('Contractor.Jobs.price')), 'DESC'],
        ],
        limit: 1,
        subQuery: false,
    });

    const { profession } = result[0];

    res.json(profession);
});

app.get('/admin/best-clients', async (req, res) => {
    const { Job, Contract, Profile } = req.app.get('models');
    const { startDate, endDate, limit } = req.query;

    if (!startDate || !endDate) return res.status(400).end('Start date and end date must be set');

    try {
        const clients = await Profile.findAll({
            where: {
                type: 'client',
                '$Client.Jobs.paid$': true,
                '$Client.Jobs.paymentDate$': {[Op.between]: [startDate, endDate]},
            },
            include: [{ model: Contract, required: true, as: 'Client', include: [{ model: Job }] }],
            group: ['Profile.id'],
            order: [
                [fn('sum', col('Client.Jobs.price')), 'DESC'],
            ],
            limit: limit || 2,
            subQuery: false,
        });

        res.json(clients);
    } catch (e) {
        console.log(e);
        res.status(500).end()
    }

    // res.json(clients);
});

module.exports = app;
