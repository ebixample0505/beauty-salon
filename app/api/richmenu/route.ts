import { NextRequest, NextResponse } from 'next/server';

type MenuItem = {
  label: string;
  url: string;
};

type TabData = {
  tabAItems: MenuItem[];
  tabBItems: MenuItem[];
  tabALabel: string;
  tabBLabel: string;
};

export async function POST(req: NextRequest) {
  try {
    const { tabAItems, tabBItems, tabALabel, tabBLabel }: TabData = await req.json();
    const token = process.env.LINE_CHANNEL_ACCESS_TOKEN!;

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    };

    // STEP 1: 既存エイリアスを削除
    const aliasListRes = await fetch('https://api.line.me/v2/bot/richmenu/alias/list', { headers });
    const aliasListData = await aliasListRes.json();
    if (aliasListData.aliases) {
      for (const alias of aliasListData.aliases) {
        await fetch(
          `https://api.line.me/v2/bot/richmenu/alias/${alias.richMenuAliasId}`,
          { method: 'DELETE', headers }
        );
      }
    }

    // STEP 2: 既存リッチメニューを全削除
    const listRes = await fetch('https://api.line.me/v2/bot/richmenu/list', { headers });
    const listData = await listRes.json();
    if (listData.richmenus) {
      for (const menu of listData.richmenus) {
        await fetch(`https://api.line.me/v2/bot/richmenu/${menu.richMenuId}`, {
          method: 'DELETE',
          headers,
        });
      }
    }

    // STEP 3: リッチメニューを作成
    // switchToAlias: このメニューの切り替えボタンが遷移する先のエイリアスID
    const createMenu = async (
      items: MenuItem[],
      label: string,
      switchToAlias: string
    ): Promise<string> => {
      const areas = items.map((item: MenuItem, i: number) => {
        // 最後のボタン（index=2）をタブ切り替えボタンにする
        const isSwitch = i === 2;
        return {
          bounds: {
            x: i * 833,
            y: 0,
            width: i === 2 ? 834 : 833, // 合計2500になるよう最後だけ+1
            height: 1686,
          },
          action: isSwitch
            ? {
                type: 'richmenuswitch',
                label: item.label,
                richMenuAliasId: switchToAlias,
                data: `tab=${switchToAlias}`,
              }
            : {
                type: 'uri',
                label: item.label,
                uri: item.url,
              },
        };
      });

      const body = {
        size: { width: 2500, height: 1686 },
        selected: false,
        name: label,
        chatBarText: label,
        areas,
      };

      const res = await fetch('https://api.line.me/v2/bot/richmenu', {
        method: 'POST',
        headers,
        body: JSON.stringify(body),
      });
      const data = await res.json();
      console.log(`${label} 作成結果 (status ${res.status}):`, JSON.stringify(data));

      // ★修正ポイント: LINE側がエラーを返したら例外を投げて表面化させる
      if (!res.ok || !data.richMenuId) {
        throw new Error(
          `「${label}」の作成に失敗しました (status ${res.status}): ${JSON.stringify(data)}`
        );
      }

      return data.richMenuId as string;
    };

    // タブAのボタン3 → tab-b へ切り替え
    // タブBのボタン3 → tab-a へ切り替え
    const tabAId = await createMenu(tabAItems, tabALabel, 'tab-b');
    const tabBId = await createMenu(tabBItems, tabBLabel, 'tab-a');

    console.log('タブA ID:', tabAId);
    console.log('タブB ID:', tabBId);

    return NextResponse.json({ success: true, tabAId, tabBId });
  } catch (error) {
    console.error('エラー:', error);
    // ★修正ポイント: フロントに実際のエラーメッセージを返す
    return NextResponse.json({ error: error instanceof Error ? error.message : String(error) }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const token = process.env.LINE_CHANNEL_ACCESS_TOKEN!;

    const formData = await req.formData();
    const image = formData.get('image') as File;
    const richMenuId = formData.get('richMenuId') as string;
    const tabAId = formData.get('tabAId') as string;
    const tabBId = formData.get('tabBId') as string;
    const isLastUpload = formData.get('isLastUpload') === 'true';

    if (!image || !richMenuId) {
      return NextResponse.json({ error: 'Missing image or richMenuId' }, { status: 400 });
    }

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    };

    const imageBuffer = await image.arrayBuffer();
    const contentType = image.type || 'image/jpeg';

    // 画像アップロード
    const uploadRes = await fetch(
      `https://api-data.line.me/v2/bot/richmenu/${richMenuId}/content`,
      {
        method: 'POST',
        headers: {
          'Content-Type': contentType,
          'Authorization': `Bearer ${token}`,
        },
        body: imageBuffer,
      }
    );

    if (!uploadRes.ok) {
      const err = await uploadRes.text();
      console.error('画像アップロードエラー:', uploadRes.status, err);
      return NextResponse.json({ error: `画像アップロード失敗 (${uploadRes.status}): ${err}` }, { status: 400 });
    }

    // 両画像アップロード完了後にエイリアスとデフォルト設定
    if (isLastUpload && tabAId && tabBId) {
      // エイリアスA作成（tab-a → tabAId）
      const aliasARes = await fetch('https://api.line.me/v2/bot/richmenu/alias', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          richMenuAliasId: 'tab-a',
          richMenuId: tabAId,
        }),
      });
      const aliasAText = await aliasARes.text();
      console.log('エイリアスA作成:', aliasARes.status, aliasAText);
      if (!aliasARes.ok) {
        return NextResponse.json({ error: `エイリアスA作成失敗: ${aliasAText}` }, { status: 400 });
      }

      // エイリアスB作成（tab-b → tabBId）
      const aliasBRes = await fetch('https://api.line.me/v2/bot/richmenu/alias', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          richMenuAliasId: 'tab-b',
          richMenuId: tabBId,
        }),
      });
      const aliasBText = await aliasBRes.text();
      console.log('エイリアスB作成:', aliasBRes.status, aliasBText);
      if (!aliasBRes.ok) {
        return NextResponse.json({ error: `エイリアスB作成失敗: ${aliasBText}` }, { status: 400 });
      }

      // タブAをデフォルトに設定
      const setDefaultRes = await fetch(
        `https://api.line.me/v2/bot/user/all/richmenu/${tabAId}`,
        { method: 'POST', headers }
      );
      const setDefaultText = await setDefaultRes.text();
      console.log('デフォルト設定:', setDefaultRes.status, setDefaultText);
      if (!setDefaultRes.ok) {
        return NextResponse.json({ error: `デフォルト設定失敗: ${setDefaultText}` }, { status: 400 });
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('エラー:', error);
    return NextResponse.json({ error: error instanceof Error ? error.message : String(error) }, { status: 500 });
  }
}