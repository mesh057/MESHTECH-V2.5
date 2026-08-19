import os
import re

# Define the replacement map for endpoints
replacements = {
    # Domains
    r"https?://api\.giftedtech\.co\.ke": "${MeshTechApi}",
    r"https?://yts\.meshtechtech\.co\.ke": "${MeshTechApi}/api/s/yts",
    r"https?://files\.meshtechtech\.co\.ke": "https://api.siputzx.my.id",
    r"https?://apiskeith\.top": "https://api.maher-zubair.tech", # Alternative for sports
    r"https?://bing-search\.apis-bj-devs\.workers\.dev": "https://api.maher-zubair.tech/search/bing",
    r"https?://pinterest-search\.apis-bj-devs\.workers\.dev": "https://api.maher-zubair.tech/search/pinterest",
    r"https?://nation-info\.apis-bj-devs\.workers\.dev": "https://api.maher-zubair.tech/details/country",

    # Search paths
    r"/api/search/google\?": "/api/s/google?",
    r"/api/search/googleimage\?": "/api/s/gimage?",
    r"/api/search/unsplash\?": "/api/s/unsplash?",
    r"/api/search/wallpaper\?": "/api/s/wallpaper?",
    r"/api/search/weather\?": "/api/s/weather?",
    r"/api/search/npmsearch\?": "/api/s/npm?",
    r"/api/search/wattpad\?": "/api/s/wattpad?",
    r"/api/search/happymod\?": "/api/s/happymod?",
    r"/api/search/lyricsv2\?": "/api/s/lyrics?",
    r"/api/search/shazam\?": "/api/s/shazam?",
    r"/api/search/spotifysearch\?": "/api/s/spotifysearch?",
    r"/api/search/bible\?": "/api/s/bible?",
    r"/api/search/github\?": "/api/s/github?",
    
    # Tools paths
    r"/api/tools/ttp\?": "/api/tools/ttp?",
    r"/api/tools/fancy\?": "/api/tools/fancy?",
    r"/api/tools/ssweb\?": "/api/tools/ssweb?",
    r"/api/tools/remini\?": "/api/tools/remini?",
    r"/api/tools/photoeditor\?": "/api/tools/photoeditor?",
    r"/api/tools/topdf\?": "/api/tools/topdf?",
    r"/api/tools/whois\?": "/api/tools/whois?",
    r"/api/tools/readqr\?": "/api/tools/readqr?",
    r"/api/tools/createqr\?": "/api/tools/createqr?",
    r"/api/tools/emojimix\?": "/api/tools/emojimix?",
    r"/api/tools/define\?": "/api/tools/define?",
    r"/api/tools/web2zip\?": "/api/tools/web2zip?",
    r"/api/tools/ssphone\?": "/api/tools/ssphone?",
    r"/api/tools/sstab\?": "/api/tools/sstab?",
    r"/api/tools/sspc\?": "/api/tools/sspc?",
    
    # Downloader paths (catch all)
    r"/api/download/twitter\?": "/api/d/twitter?",
    r"/api/download/instadl\?": "/api/d/igram?",
    r"/api/download/snackdl\?": "/api/d/snackvideo?",
    r"/api/download/spotifydl\?": "/api/d/spotify?",
    r"/api/download/spotifydlv2\?": "/api/d/spotify?",
    r"/api/download/gdrivedl\?": "/api/d/gdrivedl?",
    r"/api/download/mediafiredl\?": "/api/d/mediafire?",
    r"/api/download/fbdl\?": "/api/d/facebook?",
    r"/api/download/tiktok\?": "/api/d/tiktok?",
    
    # Remove apikey param where not needed by new API
    r"apikey=\${MeshTechApiKey}&": "",
    r"&apikey=\${MeshTechApiKey}": "",
    r"\?apikey=\${MeshTechApiKey}": "?",
}

def restore_file(filepath):
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()
    
    original = content
    for pattern, replacement in replacements.items():
        content = re.sub(pattern, replacement, content)
    
    if content != original:
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(content)
        return True
    return False

plugin_dir = "/home/ubuntu/MESHTECH-V2.5/plugins"
files = [f for f in os.listdir(plugin_dir) if f.endswith('.js')]

updated_count = 0
for filename in files:
    if restore_file(os.path.join(plugin_dir, filename)):
        updated_count += 1
        print(f"Updated: {filename}")

print(f"Total files updated: {updated_count}")
