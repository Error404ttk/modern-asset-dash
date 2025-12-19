module.exports = {
    apps: [
        {
            name: "modern-asset-dash",
            script: "./node_modules/.bin/serve",
            args: "-s dist -l 8989",
            env: {
                NODE_ENV: "production"
            }
        }
    ]
};
