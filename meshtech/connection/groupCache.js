const NodeCache = require("node-cache");
const { getAllLidMappingsFromDb } = require("../database/lidMapping");

const groupCache = new NodeCache({
    stdTTL: 5 * 60,
    useClones: false,
    checkperiod: 60,
});

const lidToJidStore = new NodeCache({
    stdTTL: 24 * 60 * 60,
    useClones: false,
    checkperiod: 300,
});

const storeLidMapping = (lid, jid) => {
    if (lid && jid && lid.endsWith("@lid") && jid.endsWith("@s.whatsapp.net")) {
        lidToJidStore.set(lid, jid);
    }
};

const getLidMapping = (lid) => {
    if (!lid || typeof lid !== "string") return null;
    return lidToJidStore.get(lid);
};

const updateLidMappingsFromMetadata = (metadata) => {
    if (!metadata?.participants) return;
    for (const p of metadata.participants) {
        const lid = p.lid || p.id;
        const jid = p.pn || p.jid;
        if (lid && jid) {
            storeLidMapping(lid, jid);
        }
    }
};

const isExpectedError = (errorMsg) => {
    const expectedErrors = [
        "forbidden",
        "item-not-found",
        "not-authorized",
        "gone",
    ];
    return expectedErrors.some((e) => errorMsg?.toLowerCase().includes(e));
};

const getGroupMetadata = async (MeshTech, jid) => {
    if (!jid || !jid.endsWith("@g.us")) return null;

    try {
        const cached = groupCache.get(jid);
        if (cached) {
            updateLidMappingsFromMetadata(cached);
            return cached;
        }

        const metadata = await MeshTech.groupMetadata(jid);
        if (metadata) {
            groupCache.set(jid, metadata);
            updateLidMappingsFromMetadata(metadata);
        }
        return metadata;
    } catch (error) {
        if (!isExpectedError(error.message)) {
            console.error(
                `Failed to get group metadata for ${jid}:`,
                error.message,
            );
        }
        return null;
    }
};

const updateGroupCache = (jid, metadata) => {
    if (jid && metadata) {
        groupCache.set(jid, metadata);
        updateLidMappingsFromMetadata(metadata);
    }
};

const deleteGroupCache = (jid) => {
    groupCache.del(jid);
};

const clearGroupCache = () => {
    groupCache.flushAll();
};

const setupGroupCacheListeners = (MeshTech) => {
    MeshTech.ev.on("groups.update", async ([event]) => {
        try {
            if (event?.id) {
                const metadata = await MeshTech.groupMetadata(event.id);
                updateGroupCache(event.id, metadata);
            }
        } catch (error) {
            deleteGroupCache(event?.id);
            if (!isExpectedError(error.message)) {
                console.error(
                    `Failed to update group cache for ${event?.id}:`,
                    error.message,
                );
            }
        }
    });
};

const initializeLidStore = async (MeshTech) => {
    try {
        const mappings = await getAllLidMappingsFromDb();
        if (mappings && typeof mappings === 'object') {
            for (const [lid, jid] of Object.entries(mappings)) {
                storeLidMapping(lid, jid);
            }
        }
    } catch (error) {
        console.error("Failed to initialize LID store:", error.message);
    }
};

module.exports = {
    groupCache,
    getGroupMetadata,
    updateGroupCache,
    deleteGroupCache,
    clearGroupCache,
    setupGroupCacheListeners,
    cachedGroupMetadata: groupCache,
    initializeLidStore,
    getLidMapping,
    updateLidMappingsFromMetadata,
    storeLidMapping
};
