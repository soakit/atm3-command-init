var Promise = require('bluebird');
var fs = require('fs');
var path = require('path');
var exists = fs.existsSync;
var write = fs.writeFileSync;
var mkdir = fs.mkdirSync;
var rVariable = /\$\{([\w\.\-_]+)(?:\s+(.+?))?\}/g;
var child_process = require('child_process');

exports.name = 'init';
exports.usage = '<mobile|pc|conf>';
exports.desc = 'scaffold with specifed template mobile or pc or just update fis-conf.js file. default is mobile';

exports.register = function (commander) {
    commander
        .option('-u, --username <userName>', 'set username')
        .option('-p, --projectname <projectName>', 'set projectname')
        .action(function (template) {
            var args = [].slice.call(arguments);
            var options = args.pop();

            var settings = {
                userName: options.username || '',
                projectName: options.projectname || '',
                template: args[0] || 'mobile'
            };

            // 根据 fis-conf.js 确定 root 目录
            Promise.try(function () {
                if (!settings.root) {
                    var findup = require('findup');

                    return new Promise(function (resolve, reject) {
                        var fup = findup(process.cwd(), 'fis-conf.js');
                        var dir = null;

                        fup.on('found', function (found) {
                            dir = found;
                            fup.stop();
                        });

                        fup.on('error', reject);

                        fup.on('end', function () {
                            resolve(dir);
                        });
                    }).then(function (dir) {
                            settings.root = dir || process.cwd();
                        });
                }
            }).then(function () {// prompt
                fis.log.info('Current Dir: %s', settings.root);

                if (settings.userName && settings.projectName) {
                    return settings;
                } else {
                    var schema = [];
                    var variables = {
                        username: '',
                        projectname: ''
                    };

                    Object.keys(variables).forEach(function (key) {
                        schema.push({
                            name: key,
                            required: true,
                            'default': variables[key]
                        });
                    });

                    if (schema.length) {
                        var prompt = require('prompt');
                        prompt.start();

                        return new Promise(function (resolve, reject) {
                            prompt.get(schema, function (error, result) {
                                if (error) {
                                    return reject(error);
                                }

                                settings.userName = result.username;
                                settings.projectName = result.projectname;
                                resolve(settings);
                            });
                        });
                    }

                    return settings;
                }
            }).then(function () {
                fis.log.info("settings: ", settings);
                if (!settings.userName || !settings.projectName) {
                    fis.log.error("userName and projectName is required!");
                    return process.exit(0);
                }
                var projectDir = settings.root + '/' + settings.projectName;
                if (path.basename(settings.root) === settings.projectName) {
                    projectDir = settings.root;
                }
                if (!exists(projectDir)) {
                    mkdir(projectDir);
                    fis.log.info("mkdir %s [OK]", projectDir);
                }

                copyFiles(projectDir, settings.userName, settings.projectName, settings.template);

                if (settings.template === 'mobile' || settings.template === 'pc') {
                    var dirs = ['font', 'img'];

                    dirs.forEach(function (dir) {
                        if (!exists(projectDir + '/' + dir))
                            mkdir(projectDir + '/' + dir);
                    });
                    fis.log.info('mkdir empty dirs: ', dirs, " [OK]");

                    fis.log.info('init ' + settings.template + ' project done!');
                }
            });

        });
};

function copyFiles(projectDir, username, projectName, template) {
    var isMobile = template !== 'pc';

    var fisConf = fs.readFileSync(__dirname + '/templates/fis-conf.js', {encoding: 'utf8'});
    fisConf = fisConf.replace('__userName__', username)
        .replace('__projectName__', projectName)
        //.replace('__scale__', isMobile ? 0.5 : 1.0);

    write(projectDir + "/fis-conf.js", fisConf, {encoding: 'utf8'});
    fis.log.info("generate fis-conf.js OK");

    if (template !== 'mobile' && template !== 'pc') {
        fis.log.info("just update fis-conf.js file!");
        return false;
    }

    if (isMobile) {
        fis.util.copy(__dirname + "/templates/mobile", projectDir, null, null, true);
    } else {
        fis.util.copy(__dirname + "/templates/pc", projectDir, null, null, true);
    }
    fis.log.info("copy html, css, js files OK!");
}
