<template>
  <div class="container">
    <div class="row justify-content-md-center">
      <div class="col-12 tips">
        <div class="row">
          1. 打开网址并登录：https://jxzh.zh12333.com/zhskillWeb/
        </div>

        <div class="row">
          2. 找到位置：按F12 - 应用 - 存储 / 本地存储空间 / https://jxzh.zh12333.com - 复制： accessToken 和
          refreshToken
        </div>
      </div>
    </div>

    <div class="row justify-content-md-center">
      <div class="col-5">
        <b-form @submit="auto_play">
          <b-form-input id="access-token" name="access_token" v-model="token.access_token"
                        required
                        style="margin-top: 20px;"
                        size="lg"
                        placeholder="粘贴 accessToken"></b-form-input>

          <b-form-input id="refresh-token" name="refresh_token" v-model="token.refresh_token"
                        required
                        style="margin-top: 20px;"
                        size="lg"
                        placeholder="粘贴 refreshToken"></b-form-input>
          <div class="row">
            <button :disabled="btn_disabled" id="btn-x" type="submit" class="btn-x btn btn-primary ">{{
                this.status
              }}
            </button>
          </div>
        </b-form>
      </div>
    </div>

    <div class="row justify-content-md-center">
      <div class="col">
        <hr>
        <table class="table table-hover">
          <thead>
          <tr>
            <th scope="col">课程</th>
            <th scope="col">分P</th>
            <th scope="col">观看进度</th>
            <th scope="col"></th>
            <th scope="col">总时长</th>
            <th scope="col">来源</th>
            <th scope="col"></th>
          </tr>
          </thead>
          <tbody>
          <tr v-for="(video, index) in unfinished_videos" :key="index">
            <td>{{ video.course_name }}</td>
            <td>{{ video.sort }}</td>
            <td>
              <div class="progress">
                <div :id="video.courseware_id" class="progress-bar bg-color"
                     role="progressbar" aria-valuemin="0"
                     :aria-valuenow="parseInt(video.duration)"
                     :aria-valuemax="parseInt(video.total_duration)"
                     :style="'width:'+ ((parseInt(video.duration) / parseInt(video.total_duration)) * 100).toFixed(2) +'%'">
                </div>
              </div>
            </td>
            <td>
              {{ secondsToPercentage(video.duration, video.total_duration) }}
            </td>
            <td>{{ secondsToMinutes(video.total_duration) }}</td>
            <td>{{ video.label }}</td>
            <td>
              <div class="spinner-grow  spinner-grow-sm text-success" role="status" v-if="video.playing==='1'">
                <span class="visually-hidden">Loading...</span></div>
            </td>
          </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>
<script>
import axios from 'axios';

export default {
  name: 'AutoPlay',
  data() {
    return {
      unfinished_videos: [],
      token: {
        access_token: '',
        refresh_token: '',
      },
      status: '一键观看',
      btn_disabled: false
    };
  },

  methods: {
    // 自动播放
    auto_play(e) {
      e.preventDefault();
      this.status = '正在解析课程...'
      this.btn_disabled = true

      this.refresh_token()

      // 获取课程
      axios.post('/courses', {
        'access_token': this.token.access_token,
        'refresh_token': this.token.refresh_token,
      })
        .then((res) => {

          this.unfinished_videos = res.data;
          // 播放视频
          this.playVideos();

        })
        .catch((error) => {
          // eslint-disable-next-line
          this.status = '一键观看'
          this.btn_disabled = false
          console.error(error);
        });
    },

    // 播放视频
    playVideos() {

      if (this.unfinished_videos.length === 0) {
        this.status = '检查一下是不是粘错了'
        this.btn_disabled = false
        return
      }

      this.status = '程序员正在后台观看视频...'
      this.btn_disabled = true

      // 开始播放课程
      this.play_control()
    },

    // 播放视频
    play_control() {
      let i = 0
      let interval = setInterval(async () => {

        if (this.unfinished_videos.length === 0) {
          clearInterval(interval)
          return
        }

        // 课程全部播放完成
        if (i === this.unfinished_videos.length) {
          this.status = '课程已全部完成'
          this.btn_disabled = true
          clearInterval(interval)
          return
        }

        let current_video = this.unfinished_videos[i]
        current_video.access_token = this.token.access_token

        // 视频未开始播放时，加载视频
        if (current_video['total_duration'] === '未加载') {

          axios.post('/init_video', current_video)
            .then((res) => {
              // 加载视频时长
              this.unfinished_videos[i]['duration'] = 0
              this.unfinished_videos[i]['total_duration'] = (parseInt(res.data['total_duration']))
              this.unfinished_videos[i]['browse_id'] = (res.data['browse_id'])
            })
            .catch((error) => {
              if (error.response.status === 401) {
                this.refresh_token()
              }
              console.error(error);
            });
        }
        // 已加载视频
        else {

          switch (current_video['playing']) {
            // 未开始播放
            case '0':

              if (this.unfinished_videos[i]['duration'] === 0) {

                axios.post('/play_start', current_video)
                  .then(() => {
                    this.unfinished_videos[i]['playing'] = '1'
                  })
                  .catch((error) => {
                    if (error.response.status === 401) {
                      this.refresh_token()
                    }
                    console.error(error);
                  });
              }
              break

            // 播放中
            case '1':

              // 播放完成
              if (current_video['duration'] === current_video['total_duration']) {
                await axios.post('/play_finish', current_video)
                  .then(() => {
                    this.unfinished_videos[i]['playing'] = '0'
                    i++
                  })
                  .catch((error) => {
                    if (error.response.status === 401) {
                      this.refresh_token()
                    }
                    // 更新播放时长记录异常
                    if (error.response.status === 400){
                      // 从头播放
                      this.unfinished_videos[i]['playing'] = '0'
                      this.unfinished_videos[i]['total_duration'] = '未加载'
                    }
                    console.error(error);
                  });

                // 播放中，发送心跳，伪装播放
              } else {
                let simulate_duration = current_video['duration'] + 3
                if (simulate_duration >= current_video['total_duration']) {
                  simulate_duration = current_video['total_duration']
                }

                this.unfinished_videos[i]['duration'] = simulate_duration

                axios.post('/play_heartbeat', current_video)
                  .then(() => {
                  })
                  .catch((error) => {
                    if (error.response.status === 401) {
                      this.refresh_token()
                    }
                  });
              }
              break
          }
        }
      }, 3000)
    },

    secondsToMinutes(seconds) {
      if ('未加载' === seconds) {
        return '未加载'
      }
      let minutes = Math.floor(seconds / 60).toString().padStart(2, '0');
      let secondsLeft = (seconds % 60).toString().padStart(2, '0');
      return `${minutes}:${secondsLeft}`;
    },
    secondsToPercentage(duration, total) {
      if ('未加载' === total) {
        return '未加载'
      }
      return ((parseInt(duration) / parseInt(total)) * 100).toFixed(2) + '%'

    },

    // 刷新token
    async refresh_token() {
      await axios.post(
        '/refresh_token',
        {
          'access_token': this.token.access_token,
          'refresh_token': this.token.refresh_token
        }
      ).then((res) => {
        if (res.status === 200) {
          this.token = res.data
        }
      }).catch((error) => {
        if (error.response.status === 401) {
          this.status = '登录过期，刷新页面重来'
          this.btn_disabled = true
          this.unfinished_videos = []
        }
        console.error(error);
      })
    },
  },

  created() {
  },
};
</script>

<style>
.form-control-lg {
  color: #183153;
  font-size: 16px;
  border-color: #616D8A;
  border-style: solid;
  border-width: 2px;
}

.banner {
  font-weight: bold;
  border-color: #DFE1E7;
  background-color: white;
  border-radius: .5rem;
  color: #ffffff;
  padding: 25px;
  margin-top: 10px;
  padding: 2%;
  border-style: solid;
}

.tips {
  margin-block-start: -16px;
  font-weight: 700;
  font-size: 18.2px;
  line-height: 1.8;
  padding-left: 28px;
  background-color: #f36944;
  border-radius: .5rem;
  color: white;
  padding-top: 10px;
  padding-bottom: 10px;
  margin-bottom: 20px;
}

td {
  align-content: center;
}

.bg-color {
  background-color: #183153;
}

#btn-x {
  height: 59px;
  margin-top: 50px;
  margin-bottom: 30px;
  background-color: #ffffff;
  color: #001e42;
  cursor: pointer;
  border-radius: .5rem;
  border: 2px solid #001e42;
  box-shadow: 0 .385rem 0 #001e42;
  text-decoration: none;
  padding: .75rem 1.25rem;
  font-weight: 600;
  transition: all .15s ease-in-out;
}

#btn-x:hover {
  background-color: #c3c6d0;
  border: 2px solid #001e42;
}

#btn-x:active {
  box-shadow: none;
  background-color: #c3c6d0;
  transform: translateY(6px);
}
</style>
