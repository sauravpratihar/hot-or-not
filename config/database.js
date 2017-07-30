module.exports = {

    'secret': 'sauravpratihar',
    'database': process.env.MONGOLAB_URI || process.env.MONGOHQ_URL || 'mongodb://localhost:27017/hotornot'

};