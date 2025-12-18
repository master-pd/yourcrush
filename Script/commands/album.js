const axios = require('axios');

module.exports = {
    config: {
        name: "album",
        version: "2.5",
        author: "RANA",
        countDown: 15,
        role: 0,
        shortDescription: {
            en: "Facebook album manager",
            bn: "ফেসবুক অ্যালবাম ব্যবস্থাপক"
        },
        longDescription: {
            en: "Create, view and manage Facebook photo albums",
            bn: "ফেসবুক ফটো অ্যালবাম তৈরি, দেখুন এবং ব্যবস্থাপনা করুন"
        },
        category: "media",
        guide: {
            en: "{pn} [create/view/list/delete] [options]",
            bn: "{pn} [create/view/list/delete] [অপশন]"
        }
    },

    onStart: async function ({ api, event, args, message, getLang }) {
        const action = args[0];
        const options = args.slice(1).join(" ");

        if (!action) {
            return message.reply(getLang("menu"));
        }

        try {
            switch (action.toLowerCase()) {
                case 'create':
                    return await createAlbum(api, event, options, message, getLang);
                
                case 'view':
                    return await viewAlbum(api, event, options, message, getLang);
                
                case 'list':
                    return await listAlbums(api, event, message, getLang);
                
                case 'delete':
                    return await deleteAlbum(api, event, options, message, getLang);
                
                case 'upload':
                    return await uploadToAlbum(api, event, options, message, getLang);
                
                default:
                    return message.reply(getLang("invalidAction"));
            }
        } catch (error) {
            console.error('Album manager error:', error);
            return message.reply(getLang("error", { error: error.message }));
        }
    },

    langs: {
        en: {
            menu: "📸 Album Manager:\n\n• {pn} create [name] [description]\n• {pn} view [album_id]\n• {pn} list\n• {pn} delete [album_id]\n• {pn} upload [album_id] [photo_url]",
            noAlbumName: "❌ Please provide album name",
            creating: "🔄 Creating album...",
            created: "✅ Album created successfully!\n\n📁 Name: {name}\n📝 Description: {description}\n🆔 Album ID: {id}",
            noAlbumID: "❌ Please provide album ID",
            viewing: "🔄 Loading album...",
            albumInfo: "📸 Album Information:\n\n📁 Name: {name}\n📝 Description: {description}\n📅 Created: {created}\n🖼️ Photos: {count}\n👁️ Privacy: {privacy}",
            noAlbums: "📭 No albums found",
            albumList: "📚 Your Albums:\n\n{list}\n\n📊 Total: {count} albums",
            deleting: "🗑️ Deleting album...",
            deleted: "✅ Album deleted successfully!\n🆔 Album ID: {id}",
            uploading: "📤 Uploading photo to album...",
            uploaded: "✅ Photo uploaded successfully!\n🖼️ To album: {name}\n🔗 Photo URL: {url}",
            invalidAction: "❌ Invalid action! Use: create, view, list, delete, upload",
            error: "❌ Error: {error}"
        },
        bn: {
            menu: "📸 অ্যালবাম ব্যবস্থাপক:\n\n• {pn} create [নাম] [বর্ণনা]\n• {pn} view [অ্যালবাম_আইডি]\n• {pn} list\n• {pn} delete [অ্যালবাম_আইডি]\n• {pn} upload [অ্যালবাম_আইডি] [ফটো_ইউআরএল]",
            noAlbumName: "❌ দয়া করে অ্যালবামের নাম দিন",
            creating: "🔄 অ্যালবাম তৈরি হচ্ছে...",
            created: "✅ অ্যালবাম সফলভাবে তৈরি হয়েছে!\n\n📁 নাম: {name}\n📝 বর্ণনা: {description}\n🆔 অ্যালবাম আইডি: {id}",
            noAlbumID: "❌ দয়া করে অ্যালবাম আইডি দিন",
            viewing: "🔄 অ্যালবাম লোড হচ্ছে...",
            albumInfo: "📸 অ্যালবাম তথ্য:\n\n📁 নাম: {name}\n📝 বর্ণনা: {description}\n📅 তৈরি: {created}\n🖼️ ফটো: {count}\n👁️ গোপনীয়তা: {privacy}",
            noAlbums: "📭 কোন অ্যালবাম পাওয়া যায়নি",
            albumList: "📚 আপনার অ্যালবাম:\n\n{list}\n\n📊 মোট: {count} অ্যালবাম",
            deleting: "🗑️ অ্যালবাম মুছে ফেলা হচ্ছে...",
            deleted: "✅ অ্যালবাম সফলভাবে মুছে ফেলা হয়েছে!\n🆔 অ্যালবাম আইডি: {id}",
            uploading: "📤 অ্যালবামে ফটো আপলোড হচ্ছে...",
            uploaded: "✅ ফটো সফলভাবে আপলোড হয়েছে!\n🖼️ অ্যালবাম: {name}\n🔗 ফটো ইউআরএল: {url}",
            invalidAction: "❌ ভুল কাজ! ব্যবহার করুন: create, view, list, delete, upload",
            error: "❌ ত্রুটি: {error}"
        }
    }
};

async function createAlbum(api, event, options, message, getLang) {
    const [name, ...descParts] = options.split(" ");
    const description = descParts.join(" ") || "Created by YOUR CRUSH ⟵o_0 bot";
    
    if (!name) {
        return message.reply(getLang("noAlbumName"));
    }
    
    await message.reply(getLang("creating"));
    
    try {
        const albumData = {
            name: name,
            description: description,
            privacy: { value: 'EVERYONE' }
        };
        
        const albumID = await api.createPhotoAlbum(albumData);
        
        return message.reply(getLang("created", {
            name: name,
            description: description,
            id: albumID
        }));
    } catch (error) {
        throw new Error(`Failed to create album: ${error.message}`);
    }
}

async function viewAlbum(api, event, albumID, message, getLang) {
    if (!albumID) {
        return message.reply(getLang("noAlbumID"));
    }
    
    await message.reply(getLang("viewing"));
    
    try {
        const albumInfo = await api.getPhotoAlbumInfo(albumID);
        
        return message.reply(getLang("albumInfo", {
            name: albumInfo.name || "Unknown",
            description: albumInfo.description || "No description",
            created: new Date(albumInfo.created_time).toLocaleDateString(),
            count: albumInfo.count || 0,
            privacy: albumInfo.privacy?.value || "Public"
        }));
    } catch (error) {
        throw new Error(`Failed to view album: ${error.message}`);
    }
}

async function listAlbums(api, event, message, getLang) {
    try {
        const albums = await api.getPhotoAlbums();
        
        if (!albums || albums.length === 0) {
            return message.reply(getLang("noAlbums"));
        }
        
        let albumList = "";
        albums.forEach((album, index) => {
            albumList += `${index + 1}. ${album.name}\n`;
            albumList += `   ↳ ID: ${album.id}\n`;
            albumList += `   ↳ Photos: ${album.count || 0}\n\n`;
        });
        
        return message.reply(getLang("albumList", {
            list: albumList,
            count: albums.length
        }));
    } catch (error) {
        throw new Error(`Failed to list albums: ${error.message}`);
    }
}

async function deleteAlbum(api, event, albumID, message, getLang) {
    if (!albumID) {
        return message.reply(getLang("noAlbumID"));
    }
    
    await message.reply(getLang("deleting"));
    
    try {
        await api.deletePhotoAlbum(albumID);
        
        return message.reply(getLang("deleted", { id: albumID }));
    } catch (error) {
        throw new Error(`Failed to delete album: ${error.message}`);
    }
}

async function uploadToAlbum(api, event, options, message, getLang) {
    const [albumID, imageUrl] = options.split(" ");
    
    if (!albumID || !imageUrl) {
        return message.reply("❌ Usage: album upload [album_id] [image_url]");
    }
    
    await message.reply(getLang("uploading"));
    
    try {
        const response = await axios.get(imageUrl, { responseType: 'arraybuffer' });
        const photoBuffer = Buffer.from(response.data, 'binary');
        
        const photoID = await api.uploadPhoto(photoBuffer, albumID);
        
        return message.reply(getLang("uploaded", {
            name: albumID,
            url: `https://facebook.com/photo.php?fbid=${photoID}`
        }));
    } catch (error) {
        throw new Error(`Failed to upload photo: ${error.message}`);
    }
}