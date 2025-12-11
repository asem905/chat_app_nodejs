const { User } = require("../models/relations/users_rooms_link");
class UserRepository {
    async getUserById(id) {
        return await User.findByPk(id);
    }
    async getUsersByIds(ids) {
        return await User.findAll({ where: { id: ids } });
    }
}
module.exports = new UserRepository(); 
