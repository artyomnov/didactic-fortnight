const request = require('supertest');

const app = require('../src/app');
const { seed } = require('../scripts/seed');

describe('App API test suit', () => {

  beforeAll(async () => {
    await seed();
  });

  describe('GET /contracts/:id ', () => {
    it('should not return contract because contract does not belong to profile', (done) => {
      request(app)
        .get('/contracts/1')
        .set('Accept', 'application/json')
        .set({'profile_id': 3})
        .expect(404, done);
    });

    it('should return contract by id for client', async () => {
      const { body } = await request(app)
        .get('/contracts/6')
        .set('Accept', 'application/json')
        .set({'profile_id': 3})
        .expect(200);

      expect(body).toMatchObject({
        ClientId: 3,
        ContractorId: 7,
        id: 6,
        status: 'in_progress',
        terms: 'bla bla bla',
      });
    });

    it('should return contract by id for contractor', async () => {
      const { body } = await request(app)
        .get('/contracts/4')
        .set('Accept', 'application/json')
        .set({'profile_id': 7})
        .expect(200);

      expect(body).toMatchObject({
        ClientId: 2,
        ContractorId: 7,
        id: 4,
        status: 'in_progress',
        terms: 'bla bla bla',
      });
    });
  });

  describe('GET /contracts', () => {
    it('should return one in progress contract for the client', async () => {
      const { body } = await request(app)
        .get('/contracts')
        .set('Accept', 'application/json')
        .set({'profile_id': 1})
        .expect(200);

      expect(body).toMatchObject([{
        ClientId: 1,
        ContractorId: 6,
        id: 2,
        status: 'in_progress',
        terms: 'bla bla bla',
      }]);
    });

    it('should return two non terminated contracts for the contractor', async () => {
      const { body } = await request(app)
        .get('/contracts')
        .set('Accept', 'application/json')
        .set({'profile_id': 8})
        .expect(200);

      expect(body).toMatchObject([
        {
          ClientId: 3,
          ContractorId: 8,
          id: 5,
          status: 'new',
          terms: 'bla bla bla',
        },
        {
          ClientId: 4,
          ContractorId: 8,
          id: 9,
          status: 'in_progress',
          terms: 'bla bla bla',
        },
      ]);
    });
  });

  describe('GET /jobs/unpaid', () => {
    it('should return one job for non paid and non terminated contracts for the client', async () => {
      const { body } = await request(app)
        .get('/jobs/unpaid')
        .set('Accept', 'application/json')
        .set({'profile_id': 4})
        .expect(200);

      expect(body).toMatchObject([{
        description: 'work',
        price: 200,
        ContractId: 7,
      }]);
    });

    it('should return one job for non paid and non terminated contracts for the client', async () => {
      const { body } = await request(app)
        .get('/jobs/unpaid')
        .set('Accept', 'application/json')
        .set({'profile_id': 1})
        .expect(200);

      expect(body).toMatchObject([{
        description: 'work',
        price: 201,
        ContractId: 2,
      }]);
    });

    it('should return no job for non paid and non terminated contracts for the contractor', async () => {
      const { body } = await request(app)
        .get('/jobs/unpaid')
        .set('Accept', 'application/json')
        .set({'profile_id': 5})
        .expect(200);

      expect(body).toMatchObject([]);
    });
  });

  describe('GET /admin/best-profession', () => {
    it('should return best profession for a whole date range', async () => {
      const { body } = await request(app)
        .get('/admin/best-profession')
        .query({ startDate: '2020-08-10', endDate: '2020-08-20' })
        .set('Accept', 'application/json')
        .set({'profile_id': 1})
        .expect(200);

      expect(body).toEqual('Programmer');
    });

    it('should return best profession for the first half date range', async () => {
      const { body } = await request(app)
        .get('/admin/best-profession')
        .query({ startDate: '2020-08-10', endDate: '2020-08-15' })
        .set('Accept', 'application/json')
        .set({'profile_id': 1})
        .expect(200);

      expect(body).toEqual('Programmer');
    });

    it('should return best profession for the first day of date range', async () => {
      const { body } = await request(app)
        .get('/admin/best-profession')
        .query({ startDate: '2020-08-10', endDate: '2020-08-11' })
        .set('Accept', 'application/json')
        .set({'profile_id': 1})
        .expect(200);

      expect(body).toEqual('Musician');
    });
  });

  describe('GET /admin/best-clients', () => {
    it('should return two best clients for the first day of date range', async () => {
      const { body } = await request(app)
        .get('/admin/best-clients')
        .query({ startDate: '2020-08-10', endDate: '2020-08-11' })
        .set('Accept', 'application/json')
        .set({'profile_id': 1})
        .expect(200);

      expect(body).toMatchObject([
        {
          balance: 1150,
          firstName: "Harry",
          id: 1,
          lastName: "Potter",
          profession: "Wizard",
          type: "client",
        }
      ]);
    });


    it('should return two best clients for a whole date range', async () => {
      const { body } = await request(app)
        .get('/admin/best-clients')
        .query({ startDate: '2020-08-10', endDate: '2020-08-20' })
        .set('Accept', 'application/json')
        .set({'profile_id': 1})
        .expect(200);

      expect(body).toMatchObject([
        {
          balance: 1.3,
          firstName: "Ash",
          id: 4,
          lastName: "Kethcum",
          profession: "Pokemon master",
          type: "client",
        },
        {
          balance: 231.11,
          firstName: "Mr",
          id: 2,
          lastName: "Robot",
          profession: "Hacker",
          type: "client",
        }
      ]);
    });

    it('should return three best clients for a whole date range', async () => {
      const { body } = await request(app)
        .get('/admin/best-clients')
        .query({ startDate: '2020-08-10', endDate: '2020-08-20', limit: 3 })
        .set('Accept', 'application/json')
        .set({'profile_id': 1})
        .expect(200);

      expect(body).toMatchObject([
        {
          balance: 1.3,
          firstName: "Ash",
          id: 4,
          lastName: "Kethcum",
          profession: "Pokemon master",
          type: "client",
        },
        {
          balance: 231.11,
          firstName: "Mr",
          id: 2,
          lastName: "Robot",
          profession: "Hacker",
          type: "client",
        },
        {
          balance: 1150,
          firstName: "Harry",
          id: 1,
          lastName: "Potter",
          profession: "Wizard",
          type: "client",
        }
      ]);
    });
  });

  describe('POST /jobs/:job_id/pay', () => {
    it('should return 404 response because contract is terminated', async () => {
      await request(app)
        .post('/jobs/1/pay')
        .set('Accept', 'application/json')
        .set({'profile_id': 1})
        .expect(404, 'No job for pay');
    });

    it('should return 400 response because client has no enough money', async () => {
      await request(app)
        .post('/jobs/5/pay')
        .set('Accept', 'application/json')
        .set({'profile_id': 4})
        .expect(400, 'There is not enough money on your balance to pay for the job');
    });

    it('should return 200 response and affect contract & client balances', async () => {
      await request(app)
        .post('/jobs/2/pay')
        .set('Accept', 'application/json')
        .set({'profile_id': 1})
        .expect(200);

      const { Profile } = app.get('models');
      const client = await Profile.findOne({where: {id: 1}});
      const contractor = await Profile.findOne({where: {id: 6}});
      expect(client.balance).toEqual(949);
      expect(contractor.balance).toEqual(1415);
    });
  });

  describe('POST /balances/deposit/:userId', () => {
    it('should return 400 response because deposit is too big', async () => {
      await request(app)
        .post('/balances/deposit/6')
        .send({ deposit: 100 })
        .set('Accept', 'application/json')
        .set({'profile_id': 1})
        .expect(400, 'You can not deposit more than 25% of total jobs to pay (deposit: 100, total: 201)');
    });

    it('should return 200 response and affect contract & client balances', async () => {
      await request(app)
        .post('/balances/deposit/6')
        .send({ deposit: 20 })
        .set('Accept', 'application/json')
        .set({'profile_id': 1})
        .expect(200);

      const { Profile } = app.get('models');
      const client = await Profile.findOne({where: {id: 1}});
      const contractor = await Profile.findOne({where: {id: 6}});
      expect(client.balance).toEqual(929);
      expect(contractor.balance).toEqual(1435);
    });
  });
});
