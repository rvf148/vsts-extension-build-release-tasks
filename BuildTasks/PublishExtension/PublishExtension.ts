///<reference path="../typings/main.d.ts" />
import tl = require("vsts-task-lib/task");
import common = require("./common");
import vsixeditor = require("./vsixeditor");
import path = require("path");

common.runTfx(tfx => {
    tfx.arg(["extension", "publish"]);

    // Read gallery endpoint
    const galleryEndpoint = common.getMarketplaceEndpointDetails();
    tfx.arg(["--token", galleryEndpoint.token]);
    tfx.arg(["--service-url", galleryEndpoint.url]);

    // Read file type
    const fileType = tl.getInput("fileType", true);
    let cleanupTfxArgs: () => void;
    if (fileType === "manifest") {
        // Set tfx manifest arguments
        cleanupTfxArgs = common.setTfxManifestArguments(tfx);
    } else {
        // Set vsix file argument
        let vsixFile = tl.getInput("vsixFile", true);
        let  outputvsix = path.join(tl.getVariable("System.DefaultWorkingDirectory"), "output.vsix");

        const publisher = tl.getInput("publisherId", false);
        const extensionId = tl.getInput("extensionId", false);
        const extensionName = tl.getInput("extensionName", false);
        const extensionVisibility = tl.getInput("extensionVisibility", false);
        const extensionVersion = tl.getInput("extensionVersion", false);

        tl.debug("Start editing of VSIX");
        let ve = new vsixeditor.VSIXEditor(vsixFile, outputvsix);
        ve.startEdit();

        if (publisher) { ve.editPublisher(publisher); }
        if (extensionId) { ve.editId(extensionId); }
        if (extensionName) { ve.editExtensionName(extensionName); }
        if (extensionVisibility) { ve.editExtensionVisibility(extensionVisibility); }
        if (extensionVersion) { ve.editVersion(extensionVersion); }

        if (!ve.hasEdits()) {
            outputvsix = vsixFile
        }
        else {
            ve.endEdit();
        }
        tfx.arg(["--vsix", outputvsix]);
    }

    // Share with
    const shareWith = tl.getInput("shareWith");
    if (shareWith) {
        // Sanitize accounts to share with
        let accounts = shareWith.split(",").map(a => a.replace(/\s/g, "")).filter(a => a.length > 0);
        tfx.argIf(accounts && accounts.length > 0, ["--share-with", ...accounts]);
    }

    // Aditional arguments
    tfx.arg(tl.getInput("arguments", false));

    // Set working folder
    const cwd = tl.getInput("cwd", false);
    if (cwd) {
        tl.cd(cwd);
    }

    tfx.exec().then(code => {
        tl.setResult(tl.TaskResult.Succeeded, `tfx exited with return code: ${code}`);
    }).fail(err => {
        tl.setResult(tl.TaskResult.Failed, `tfx failed with error: ${err}`);
    }).finally(() => {
        if (cleanupTfxArgs) {
            cleanupTfxArgs();
        }
    });
});
