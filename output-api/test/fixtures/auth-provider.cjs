class CustomAuthorizationService {
    constructor(...dependencies) {
        this.dependencies = dependencies;
    }

    async verify() {
        return true;
    }
}

module.exports = { CustomAuthorizationService, InvalidAuthorizationService: class {} };
