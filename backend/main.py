# main.py
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
# from duckduckgo_search import DDGS
import uvicorn
from langchain_community.utilities import SearxSearchWrapper, DuckDuckGoSearchAPIWrapper
# may need duckduckgo-search, ddgs

app = FastAPI()

# 配置 CORS，允许你的 React 前端（通常运行在 5173 等端口）跨域请求
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # 开发阶段允许所有来源，生产环境建议改成具体的域名
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/api/search/duckduckgo")
def search_ddg(q: str, max_results: int = 6):
    try:
        search = DuckDuckGoSearchAPIWrapper()
        raw_results = search.results(q, max_results=max_results)
        
        results = []
        for r in raw_results:
            results.append({
                "title": r.get("title", "No Title"),
                "snippet": r.get("snippet", "No Snippet"),
                "url": r.get("link", "")
            })
        return results
    except Exception as e:
        return {"error": str(e)}

# TODO
@app.get("/api/search/searxng_web")
def search_searxng_api(q: str, categories: str = "general", time_range: str = "", max_results: int = 6):
    try:
        # 提示：这里使用了一个公共实例 https://searx.be 作为测试。
        # 公共实例可能会有请求频率限制。如果报错，可以尝试更换为 https://searx.space 上的其他实例，
        # 或在生产环境中通过 Docker 部署自己的 SearxNG 服务。
        search = SearxSearchWrapper(searx_host="https://searx.be")
        
        kwargs = {"categories": categories}
        if time_range:
            kwargs["time_range"] = time_range
            
        # 调用 results 方法获取包含 title, snippet, link 字典的列表
        raw_results = search.results(q, num_results=max_results, **kwargs)
        
        results = []
        for r in raw_results:
            results.append({
                "title": r.get("title", "No Title"),
                "snippet": r.get("snippet", "No Snippet"),
                "url": r.get("link", "")
            })
        return results
    except Exception as e:
        return {"error": str(e)}


if __name__ == "__main__":
    # 启动服务，运行在本地 8000 端口
    uvicorn.run(app, host="127.0.0.1", port=8000)
