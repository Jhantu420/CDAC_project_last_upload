// models/CsvRecord.js

module.exports = (sequelize, DataTypes) => {
    const CsvRecord = sequelize.define('CsvRecord', {
      filename: {
        type: DataTypes.STRING,
        allowNull: false
      },
      filepath: {
        type: DataTypes.STRING,
        allowNull: false
      },
      gender: {
        type: DataTypes.STRING,
        allowNull: true
      },
      agegroup: {
        type: DataTypes.STRING,
        allowNull: true
      },
      textfile: {
        type: DataTypes.STRING,
        allowNull: true
      },
      tags: {
        type: DataTypes.STRING,
        allowNull: true
      },
      keywords: {
        type: DataTypes.STRING,
        allowNull: true
      },
      uploadDate: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW
      }
    });
  
    return CsvRecord;
  };
  