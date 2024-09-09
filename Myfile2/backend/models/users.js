module.exports = (sequelize, DataTypes) => {
    const Users = sequelize.define("Users", {
        name: {
            type: DataTypes.STRING,
            allowNull: false
        },
        email: {
            type: DataTypes.STRING,
            allowNull: false,
            // unique: false // Assuming email should be unique
        },
        phoneno: {
            type: DataTypes.STRING,
            allowNull: false 
        },
        password: {
            type: DataTypes.STRING,
            allowNull: false
        },
        role: {
            type: DataTypes.STRING,
            allowNull: false
        },
        login: {
            type: DataTypes.DATE,
            allowNull: true 
        },
        logout: {
            type: DataTypes.DATE,
            allowNull: true 
        },
        token: {
            type: DataTypes.STRING,
            allowNull: true
        }
    });

    return Users;
};
