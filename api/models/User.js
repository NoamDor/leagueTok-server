class User { 
    constructor(id, name, photoUrl, lastUpdated, isDeleted, isAdmin) { 
        this.id = id
        this.name = name;
        this.photoUrl = photoUrl;
        this.lastUpdated = lastUpdated;
        this.isDeleted = isDeleted;
        this.isAdmin = isAdmin
    }

    getObject() {
        return {
            name: this.name,
            photoUrl: this.photoUrl,
            lastUpdated: this.lastUpdated,
            isDeleted: this.isDeleted,
            isAdmin: this.isAdmin
        }   
    }
}

module.exports = User;